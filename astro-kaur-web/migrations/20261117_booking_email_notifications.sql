BEGIN;
ALTER TABLE public.booking_jobs DROP CONSTRAINT IF EXISTS booking_jobs_kind_check;
ALTER TABLE public.booking_jobs ADD CONSTRAINT booking_jobs_kind_check CHECK (kind IN (
  'calendar','customer','owner','reminder','cancelled','rescheduled','request','schedule_owner','availability_customer','refund',
  'cancelled_owner','rescheduled_owner','refund_owner','payment_received'
));

-- Enqueue the second recipient in the same transaction as the original event.
-- Each recipient has their own payload, lease and retry state.
CREATE OR REPLACE FUNCTION public.booking_queue_email_copies()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.kind IN ('cancelled','rescheduled','refund') THEN
    INSERT INTO public.booking_jobs(order_id,kind,version,dedupe_key,run_at,refund_id,refund_status)
    VALUES(NEW.order_id,NEW.kind||'_owner',NEW.version,NEW.dedupe_key||':owner',NEW.run_at,NEW.refund_id,NEW.refund_status)
    ON CONFLICT(dedupe_key) DO NOTHING;
  ELSIF NEW.kind='schedule_owner' THEN
    INSERT INTO public.booking_jobs(order_id,kind,version,dedupe_key,run_at)
    VALUES(NEW.order_id,'payment_received',NEW.version,NEW.order_id::text||':payment_received',NEW.run_at)
    ON CONFLICT(dedupe_key) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.booking_queue_email_copies() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS booking_email_recipient_copies ON public.booking_jobs;
CREATE TRIGGER booking_email_recipient_copies AFTER INSERT ON public.booking_jobs
FOR EACH ROW EXECUTE FUNCTION public.booking_queue_email_copies();
COMMIT;
