import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_FREE_READING_CONTENT } from "@/lib/astrology/freeReadingContent";
import { DEFAULT_ABOUT, DEFAULT_VISION } from "@/lib/homeContent";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qdnwmfriilknnwqrepuy.supabase.co",
  process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ""
);

// Force every request to be fresh — never use cached response
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // 1. Services (active only, for homepage)
    const { data: servicesData } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    // 2. Profile (About Me + Vision)
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .limit(1);

    const { data: freeReadingRow } = await supabase
      .from("free_reading_content")
      .select("content")
      .eq("id", "free-reading")
      .maybeSingle();

    let aboutContent = DEFAULT_ABOUT;
    let visionContent = DEFAULT_VISION;

    if (profilesData && profilesData.length > 0) {
      const p = profilesData[0];

      if (p.bio) {
        try {
          const parsed = JSON.parse(p.bio);
          aboutContent = { ...DEFAULT_ABOUT, ...parsed };
        } catch {
          aboutContent = {
            ...DEFAULT_ABOUT,
            paragraph_1: p.bio,
            heading_name: p.display_name || DEFAULT_ABOUT.heading_name,
          };
        }
      }

      if (p.vision) {
        try {
          const parsedVision = JSON.parse(p.vision);
          visionContent = { ...DEFAULT_VISION, ...parsedVision };
        } catch {
          visionContent = { ...DEFAULT_VISION, tag: p.vision };
        }
      }
    }

    const freeReadingContent = { ...(freeReadingRow?.content || {}) } as Record<string, unknown>;
    delete freeReadingContent.cta_secondary_label;

    return NextResponse.json(
      {
        about: aboutContent,
        vision: visionContent,
        freeReading: { ...DEFAULT_FREE_READING_CONTENT, ...freeReadingContent },
        services: servicesData || [],
      },
      {
        headers: {
          // No caching — always return fresh data to browsers and CDNs
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        about: DEFAULT_ABOUT,
        vision: DEFAULT_VISION,
        freeReading: DEFAULT_FREE_READING_CONTENT,
        services: [],
        error: err.message,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
