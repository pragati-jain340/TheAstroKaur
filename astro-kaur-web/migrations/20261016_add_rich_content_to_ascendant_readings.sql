-- Stores the complete editable reading for each Ascendant sign.
ALTER TABLE public.ascendant_readings
  ADD COLUMN IF NOT EXISTS content JSONB;
