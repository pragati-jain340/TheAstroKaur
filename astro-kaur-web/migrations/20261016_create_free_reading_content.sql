-- Editable singleton copy for the public Free Reading section.
CREATE TABLE IF NOT EXISTS public.free_reading_content (
  id          TEXT PRIMARY KEY CHECK (id = 'free-reading'),
  content     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.free_reading_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads free reading content" ON public.free_reading_content;
CREATE POLICY "Public reads free reading content"
  ON public.free_reading_content FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage free reading content" ON public.free_reading_content;
CREATE POLICY "Admins manage free reading content"
  ON public.free_reading_content FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO public.free_reading_content (id, content)
VALUES (
  'free-reading',
  '{
    "section_heading": "Discover Your Vedic Ascendant",
    "section_intro": "In authentic Vedic astrology, your Lagna (Rising Sign) is the sacred gateway to your chart—defining your instinctive vitality, core character, and life orientation.",
    "eligibility_note": "One free personalized reading per verified email · Calculated using Lahiri Ayanamsha",
    "sign_in_heading": "Sign In to Claim Your Free Reading",
    "sign_in_description": "To ensure one complimentary reading per seeker and securely save your calculated result to your private account, please sign in or register below.",
    "result_label": "Your Mini Reading",
    "cta_heading": "Want to Discover Your Story?",
    "cta_description": "Your Ascendant is only the beginning. Explore your relationships, career, and life path through a personalised Vedic reading.",
    "cta_accent": "Book a personalized Vedic Astrology Reading with me.",
    "cta_primary_label": "Book a Reading",
    "cta_secondary_label": "View All 1-on-1 Services",
    "cta_quote": "Your Ascendant is the beginning. Your complete chart tells the story."
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;
