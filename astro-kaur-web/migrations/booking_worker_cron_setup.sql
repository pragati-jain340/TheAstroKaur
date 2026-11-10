-- Run only after deploying the worker and storing both named secrets in Supabase Vault.
-- No private values belong in this file.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM vault.decrypted_secrets WHERE name='theastrokaur_booking_worker_url' AND decrypted_secret LIKE 'https://%/api/internal/booking-worker')
    OR NOT EXISTS(SELECT 1 FROM vault.decrypted_secrets WHERE name='theastrokaur_booking_worker_token' AND length(decrypted_secret)>=32) THEN
    RAISE EXCEPTION 'Configure the deployed worker URL and matching token in Vault before scheduling';
  END IF;
END $$;
SELECT cron.schedule('theastrokaur-booking-worker','* * * * *',$cron$
  SELECT net.http_post(
    url:=(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='theastrokaur_booking_worker_url' LIMIT 1),
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='theastrokaur_booking_worker_token' LIMIT 1)),
    body:='{}'::jsonb,timeout_milliseconds:=55000
  );
$cron$);
