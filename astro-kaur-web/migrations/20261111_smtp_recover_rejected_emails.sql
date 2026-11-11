-- Run after deploying the SMTP transport, before restarting the worker.
-- Only recover messages explicitly rejected
-- by the previous provider; never reset a sent or ambiguous delivery attempt.
UPDATE public.booking_jobs
SET email_started_at = NULL,
    status = 'pending',
    attempts = 0,
    lease_until = NULL,
    last_error = NULL,
    run_at = now()
WHERE kind <> 'calendar'
  AND status IN ('pending', 'failed')
  AND sent_at IS NULL
  AND provider_id IS NULL
  AND last_error LIKE 'Email provider returned 403.%';
