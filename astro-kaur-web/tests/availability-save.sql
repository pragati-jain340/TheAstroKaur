-- Run against an installed booking schema. All changes are rolled back.
BEGIN;
SELECT public.booking_save_availability(
  (SELECT to_jsonb(s) FROM public.availability_settings s WHERE id),
  '[{"weekday":1,"start_local":"18:00","end_local":"21:00","enabled":true}]'::jsonb,
  '[]'::jsonb
);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.availability_windows) <> 1 OR NOT EXISTS (
    SELECT 1 FROM public.availability_windows WHERE weekday=1 AND start_local='18:00' AND end_local='21:00'
  ) THEN RAISE EXCEPTION 'Availability was not saved'; END IF;
END $$;
ROLLBACK;
