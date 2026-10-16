-- =============================================================================
-- Migration: 20261015_create_free_readings.sql
-- Description: Creates ascendant_readings and free_readings tables with strict
--              one-reading-per-email uniqueness, RLS, and references.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ASCENDANT READINGS TABLE (Content Store for 12 Zodiac Ascendants)
-- ─────────────────────────────────────────────────────────────────────────────

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

-- RLS for ascendant_readings
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. FREE READINGS TABLE (Claim tracking & Result Snapshots)
-- ─────────────────────────────────────────────────────────────────────────────

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

-- Enforce strict one-reading-per-email uniqueness at database level
CREATE UNIQUE INDEX IF NOT EXISTS free_readings_lower_email_idx 
  ON public.free_readings (LOWER(TRIM(email)));

-- RLS for free_readings
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
