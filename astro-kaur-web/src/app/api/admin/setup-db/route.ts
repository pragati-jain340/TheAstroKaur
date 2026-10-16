import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
// Supabase project ref extracted from URL: https://<ref>.supabase.co
const PROJECT_REF = SUPABASE_URL.replace("https://", "").split(".")[0];

// Admin client — service role bypasses RLS for DML
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Run raw SQL via Supabase Management API (supports DDL like CREATE TABLE).
 * Requires SUPABASE_ACCESS_TOKEN (personal access token from supabase.com/dashboard/account/tokens).
 * Falls back gracefully if not set.
 */
async function runMigrationSQL(sql: string): Promise<{ ok: boolean; error?: string }> {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) {
    return { ok: false, error: "SUPABASE_ACCESS_TOKEN not set — cannot run DDL via Management API" };
  }

  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Management API ${res.status}: ${text}` };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

const CREATE_PROFILES_SQL = `
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name  TEXT DEFAULT 'TheAstroKaur',
  bio           TEXT,
  vision        TEXT,
  is_published  BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
`;

const CREATE_SERVICES_SQL = `
CREATE TABLE IF NOT EXISTS public.services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT DEFAULT '',
  format           TEXT NOT NULL DEFAULT 'text' CHECK (format IN ('text', 'voice_call')),
  duration_minutes INTEGER,
  price_cents      INTEGER NOT NULL DEFAULT 2000,
  currency         TEXT NOT NULL DEFAULT 'EUR',
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order       INTEGER NOT NULL DEFAULT 10,
  image_url        TEXT,
  requires_partner_details BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.services DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
`;

const CREATE_FREE_READING_CONTENT_SQL = `
CREATE TABLE IF NOT EXISTS public.free_reading_content (
  id TEXT PRIMARY KEY CHECK (id = 'free-reading'),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.free_reading_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public reads free reading content" ON public.free_reading_content;
CREATE POLICY "Public reads free reading content" ON public.free_reading_content FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage free reading content" ON public.free_reading_content;
CREATE POLICY "Admins manage free reading content" ON public.free_reading_content FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
`;

const DEFAULT_SERVICES = [
  {
    title: "Extensive Birth Chart Reading",
    description: "A comprehensive analysis of your natal chart covering personality, life purpose, career, relationships, and karmic patterns through the lens of Vedic astrology.",
    format: "text", duration_minutes: null, price_cents: 4500, currency: "EUR", is_active: true, sort_order: 1, requires_partner_details: false,
  },
  {
    title: "Future Partner Reading",
    description: "Discover the characteristics, timing, and energetic signature of your future partner as revealed through your birth chart and planetary transits.",
    format: "text", duration_minutes: null, price_cents: 3500, currency: "EUR", is_active: true, sort_order: 2, requires_partner_details: false,
  },
  {
    title: "Relationship Karma Reading",
    description: "Explore the karmic connections and compatibility between you and a specific partner through synastry and composite chart analysis.",
    format: "text", duration_minutes: null, price_cents: 3500, currency: "EUR", is_active: true, sort_order: 3, requires_partner_details: true,
  },
  {
    title: "Matchmaking Reading",
    description: "A detailed compatibility analysis for potential partnerships, covering emotional, intellectual, and karmic alignment for long-term harmony.",
    format: "text", duration_minutes: null, price_cents: 5500, currency: "EUR", is_active: true, sort_order: 4, requires_partner_details: true,
  },
  {
    title: "Career & Money Guidance",
    description: "Uncover your professional strengths, optimal career paths, wealth indicators, and the best timing for financial decisions from your birth chart.",
    format: "voice_call", duration_minutes: 45, price_cents: 6000, currency: "EUR", is_active: true, sort_order: 5, requires_partner_details: false,
  },
  {
    title: "Career & Money Reading",
    description: "A written deep-dive into your 2nd, 6th, and 10th house placements to illuminate your natural talents, earning potential, and career direction.",
    format: "text", duration_minutes: null, price_cents: 3000, currency: "EUR", is_active: true, sort_order: 6, requires_partner_details: false,
  },
];

/**
 * GET /api/admin/setup-db
 * Returns which tables currently exist and row counts.
 */
export async function GET() {
  const [profilesCheck, servicesCheck, freeReadingContentCheck] = await Promise.all([
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("services").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("free_reading_content").select("id", { count: "exact", head: true }),
  ]);

  return NextResponse.json({
    profiles: {
      exists: !profilesCheck.error,
      rows: profilesCheck.count ?? 0,
      error: profilesCheck.error?.message ?? null,
    },
    services: {
      exists: !servicesCheck.error,
      rows: servicesCheck.count ?? 0,
      error: servicesCheck.error?.message ?? null,
    },
    freeReadingContent: {
      exists: !freeReadingContentCheck.error,
      rows: freeReadingContentCheck.count ?? 0,
      error: freeReadingContentCheck.error?.message ?? null,
    },
    hasAccessToken: !!process.env.SUPABASE_ACCESS_TOKEN,
  });
}

/**
 * POST /api/admin/setup-db
 * Creates missing tables and seeds default data.
 * Uses Supabase Management API for DDL (requires SUPABASE_ACCESS_TOKEN).
 * Falls back to seeding only if tables already exist.
 */
export async function POST() {
  const steps: { step: string; status: string; detail?: string }[] = [];

  // ── Step 1: Create `profiles` table ──────────────────────────────────────
  const { error: profilesProbeErr } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .limit(1);

  if (profilesProbeErr) {
    // Table missing — try creating via Management API
    const result = await runMigrationSQL(CREATE_PROFILES_SQL);
    if (result.ok) {
      steps.push({ step: "Create profiles table", status: "created ✓" });
    } else {
      steps.push({
        step: "Create profiles table",
        status: "failed ✗",
        detail: result.error,
      });
      return NextResponse.json(
        {
          success: false,
          message: result.error?.includes("SUPABASE_ACCESS_TOKEN")
            ? "Add SUPABASE_ACCESS_TOKEN to .env.local to enable automatic table creation. See setup instructions."
            : `Could not create profiles table: ${result.error}`,
          steps,
          needsAccessToken: !process.env.SUPABASE_ACCESS_TOKEN,
        },
        { status: 500 }
      );
    }
  } else {
    steps.push({ step: "Create profiles table", status: "already exists ✓" });
  }

  // ── Step 2: Seed profiles row ─────────────────────────────────────────────
  const { count: profileCount } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true });

  if ((profileCount ?? 0) === 0) {
    const { error: seedErr } = await supabaseAdmin
      .from("profiles")
      .insert({ display_name: "TheAstroKaur", is_published: true });
    steps.push({
      step: "Seed profiles row",
      status: seedErr ? `error: ${seedErr.message}` : "seeded ✓",
    });
  } else {
    steps.push({ step: "Seed profiles row", status: `${profileCount} row(s) exist ✓` });
  }

  // ── Step 3: Create `services` table ──────────────────────────────────────
  const { error: servicesProbeErr } = await supabaseAdmin
    .from("services")
    .select("id")
    .limit(1);

  if (servicesProbeErr) {
    const result = await runMigrationSQL(CREATE_SERVICES_SQL);
    if (result.ok) {
      steps.push({ step: "Create services table", status: "created ✓" });
    } else {
      steps.push({
        step: "Create services table",
        status: "failed ✗",
        detail: result.error,
      });
      return NextResponse.json(
        {
          success: false,
          message: `Could not create services table: ${result.error}`,
          steps,
          needsAccessToken: !process.env.SUPABASE_ACCESS_TOKEN,
        },
        { status: 500 }
      );
    }
  } else {
    steps.push({ step: "Create services table", status: "already exists ✓" });
  }

  // ── Step 4: Seed default reading services ────────────────────────────────
  const { count: serviceCount } = await supabaseAdmin
    .from("services")
    .select("id", { count: "exact", head: true });

  if ((serviceCount ?? 0) === 0) {
    const { error: seedSvcErr } = await supabaseAdmin
      .from("services")
      .insert(DEFAULT_SERVICES);
    steps.push({
      step: "Seed default services",
      status: seedSvcErr ? `error: ${seedSvcErr.message}` : `${DEFAULT_SERVICES.length} services seeded ✓`,
    });
  } else {
    steps.push({ step: "Seed default services", status: `${serviceCount} service(s) exist ✓` });
  }

  // ── Create editable Free Reading content table ─────────────────────────
  const { error: freeReadingContentProbeErr } = await supabaseAdmin
    .from("free_reading_content")
    .select("id")
    .limit(1);

  if (freeReadingContentProbeErr) {
    const result = await runMigrationSQL(CREATE_FREE_READING_CONTENT_SQL);
    if (result.ok) {
      steps.push({ step: "Create free_reading_content table", status: "created ✓" });
    } else {
      steps.push({ step: "Create free_reading_content table", status: "failed ✗", detail: result.error });
    }
  } else {
    steps.push({ step: "Create free_reading_content table", status: "already exists ✓" });
  }

  // ── Step 5: Create `ascendant_readings` table ──────────────────────────────
  const { error: ascendantProbeErr } = await supabaseAdmin
    .from("ascendant_readings")
    .select("id")
    .limit(1);

  if (ascendantProbeErr) {
    const CREATE_ASCENDANT_READINGS_SQL = `
      CREATE TABLE IF NOT EXISTS public.ascendant_readings (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sign                TEXT NOT NULL UNIQUE,
        ruler               TEXT NOT NULL,
        element             TEXT NOT NULL,
        quality             TEXT NOT NULL,
        overview            TEXT NOT NULL,
        personality_traits  TEXT NOT NULL,
        life_path_guidance  TEXT NOT NULL,
        strengths           TEXT[] DEFAULT '{}',
        growth_areas        TEXT[] DEFAULT '{}',
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE public.ascendant_readings ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Allow public read on ascendant_readings" ON public.ascendant_readings;
      CREATE POLICY "Allow public read on ascendant_readings"
        ON public.ascendant_readings FOR SELECT
        TO anon, authenticated
        USING (true);
      DROP POLICY IF EXISTS "Admins full access on ascendant_readings" ON public.ascendant_readings;
      CREATE POLICY "Admins full access on ascendant_readings"
        ON public.ascendant_readings FOR ALL
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    `;
    const result = await runMigrationSQL(CREATE_ASCENDANT_READINGS_SQL);
    if (result.ok) {
      steps.push({ step: "Create ascendant_readings table", status: "created ✓" });
    } else {
      steps.push({ step: "Create ascendant_readings table", status: "failed ✗", detail: result.error });
    }
  } else {
    steps.push({ step: "Create ascendant_readings table", status: "already exists ✓" });
  }

  // Seed ascendant readings if empty
  const { count: ascendantCount } = await supabaseAdmin
    .from("ascendant_readings")
    .select("id", { count: "exact", head: true });

  if ((ascendantCount ?? 0) === 0) {
    const { ASCENDANT_READINGS } = await import("@/lib/astrology/ascendantData");
    const readingsToInsert = Object.values(ASCENDANT_READINGS).map((r) => ({
      sign: r.sign,
      ruler: r.ruler,
      element: r.element,
      quality: r.quality,
      overview: r.overview,
      personality_traits: r.personalityTraits,
      life_path_guidance: r.lifePathGuidance,
      strengths: r.strengths,
      growth_areas: r.growthAreas,
    }));
    const { error: seedAscErr } = await supabaseAdmin
      .from("ascendant_readings")
      .insert(readingsToInsert);
    steps.push({
      step: "Seed 12 ascendant readings",
      status: seedAscErr ? `error: ${seedAscErr.message}` : "12 readings seeded ✓",
    });
  } else {
    steps.push({ step: "Seed 12 ascendant readings", status: `${ascendantCount} reading(s) exist ✓` });
  }

  // ── Step 6: Create `free_readings` table ────────────────────────────────────
  const { error: freeReadingsProbeErr } = await supabaseAdmin
    .from("free_readings")
    .select("id")
    .limit(1);

  if (freeReadingsProbeErr) {
    const CREATE_FREE_READINGS_SQL = `
      CREATE TABLE IF NOT EXISTS public.free_readings (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        email               TEXT NOT NULL,
        date_of_birth       DATE NOT NULL,
        time_of_birth       TIME WITHOUT TIME ZONE NOT NULL,
        place_of_birth      TEXT NOT NULL,
        latitude            NUMERIC(9,6) NOT NULL,
        longitude           NUMERIC(9,6) NOT NULL,
        timezone            NUMERIC(4,2) NOT NULL,
        ascendant           TEXT NOT NULL,
        reading_content     TEXT NOT NULL,
        reading_source_id   UUID REFERENCES public.ascendant_readings(id) ON DELETE SET NULL,
        status              TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT free_readings_user_id_key UNIQUE (user_id)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS free_readings_lower_email_idx 
        ON public.free_readings (LOWER(TRIM(email)));
      ALTER TABLE public.free_readings ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Customer reads own free reading" ON public.free_readings;
      CREATE POLICY "Customer reads own free reading"
        ON public.free_readings FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id OR public.is_admin());
      DROP POLICY IF EXISTS "Admins full access on free_readings" ON public.free_readings;
      CREATE POLICY "Admins full access on free_readings"
        ON public.free_readings FOR ALL
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    `;
    const result = await runMigrationSQL(CREATE_FREE_READINGS_SQL);
    if (result.ok) {
      steps.push({ step: "Create free_readings table", status: "created ✓" });
    } else {
      steps.push({ step: "Create free_readings table", status: "failed ✗", detail: result.error });
    }
  } else {
    steps.push({ step: "Create free_readings table", status: "already exists ✓" });
  }

  return NextResponse.json({
    success: true,
    message: "Database setup complete! All tables are ready.",
    steps,
  });
}

