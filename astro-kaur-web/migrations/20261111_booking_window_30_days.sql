-- The slot generator and database scheduling guard read the same setting.
UPDATE public.availability_settings SET advance_window_days = 30, updated_at = now() WHERE id;
ALTER TABLE public.availability_settings ALTER COLUMN advance_window_days SET DEFAULT 30;
