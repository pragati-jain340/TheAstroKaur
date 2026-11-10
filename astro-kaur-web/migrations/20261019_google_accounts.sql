BEGIN;
CREATE TABLE IF NOT EXISTS public.google_user_connections (
  auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  google_primary_calendar_id text NOT NULL,
  encrypted_refresh_token text, encrypted_access_token text,
  access_expires_at timestamptz, granted_scopes text[] NOT NULL DEFAULT '{}',
  token_version uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'connected' CHECK(status IN ('connected','reconnect_required','disconnecting','disconnected')),
  connected_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  CHECK(status IN ('disconnecting','disconnected') OR encrypted_refresh_token IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS google_account_one_active_user ON public.google_user_connections(google_primary_calendar_id)
  WHERE status IN ('connected','reconnect_required','disconnecting');
ALTER TABLE public.google_user_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.google_user_connections FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.google_user_connections TO service_role;
ALTER TABLE public.google_calendar_connections ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES public.google_user_connections(auth_user_id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.google_require_no_commitments() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  -- Purchases hold a share lock on settings. Wait for them before checking
  -- commitments, and keep new purchases blocked until the organizer change commits.
  PERFORM 1 FROM public.availability_settings WHERE id FOR UPDATE;
  IF EXISTS(SELECT 1 FROM public.orders WHERE format='voice_call' AND status='confirmed' AND payment_verified_at IS NOT NULL AND COALESCE(scheduled_end_at,scheduled_at)>now())
    OR EXISTS(SELECT 1 FROM public.booking_reservations WHERE state='held' AND blocked_until>now())
    OR EXISTS(SELECT 1 FROM public.booking_jobs j JOIN public.orders o ON o.id=j.order_id WHERE j.kind='calendar' AND j.status IN ('pending','processing','failed') AND o.format='voice_call' AND o.payment_verified_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Upcoming paid calls, pending holds and calendar synchronization jobs must be resolved before changing or disconnecting the organizer';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.google_save_connection(p_user uuid,p_primary text,p_refresh text,p_access text,p_expires timestamptz,p_scopes text[],p_organizer boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE current_user_connection public.google_user_connections;organizer public.google_calendar_connections;different_identity boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('theastrokaur_google_organizer',0));
  IF NOT EXISTS(SELECT 1 FROM public.customer_profiles WHERE auth_user_id=p_user AND account_status='active') THEN RAISE EXCEPTION 'Active account required'; END IF;
  IF p_organizer AND NOT EXISTS(SELECT 1 FROM public.customer_profiles WHERE auth_user_id=p_user AND role='admin' AND account_status='active') THEN RAISE EXCEPTION 'Administrator required'; END IF;
  SELECT * INTO organizer FROM public.google_calendar_connections WHERE id FOR UPDATE;
  SELECT * INTO current_user_connection FROM public.google_user_connections WHERE auth_user_id=p_user FOR UPDATE;
  IF current_user_connection.status='disconnecting' THEN RAISE EXCEPTION 'Disconnection is in progress; please reconnect afterward'; END IF;
  different_identity:=current_user_connection.google_primary_calendar_id IS DISTINCT FROM p_primary;
  IF (p_organizer AND organizer.id IS NOT NULL AND (organizer.auth_user_id IS DISTINCT FROM p_user OR organizer.organizer_email IS DISTINCT FROM p_primary))
    OR (organizer.auth_user_id=p_user AND different_identity) THEN
    PERFORM public.google_require_no_commitments();
    UPDATE public.availability_settings SET booking_enabled=false WHERE id;
  END IF;
  IF p_refresh IS NULL OR p_refresh NOT LIKE 'g1.%' OR p_access IS NULL OR p_access NOT LIKE 'g1.%' THEN RAISE EXCEPTION 'Encrypted Google credentials required'; END IF;
  INSERT INTO public.google_user_connections(auth_user_id,google_primary_calendar_id,encrypted_refresh_token,encrypted_access_token,access_expires_at,granted_scopes)
    VALUES(p_user,p_primary,p_refresh,p_access,p_expires,p_scopes)
    ON CONFLICT(auth_user_id) DO UPDATE SET google_primary_calendar_id=p_primary,encrypted_refresh_token=p_refresh,encrypted_access_token=p_access,access_expires_at=p_expires,
      granted_scopes=p_scopes,token_version=gen_random_uuid(),status='connected',connected_at=now(),updated_at=now(),last_error=NULL;
  IF p_organizer OR organizer.auth_user_id=p_user THEN
    INSERT INTO public.google_calendar_connections(id,auth_user_id,organizer_email,calendar_id,busy_calendar_ids,encrypted_refresh_token,status)
      VALUES(true,p_user,p_primary,'primary',ARRAY['primary'],'','connected')
      ON CONFLICT(id) DO UPDATE SET auth_user_id=p_user,organizer_email=p_primary,encrypted_refresh_token='',status='connected',last_error=NULL,updated_at=now(),
        calendar_id=CASE WHEN google_calendar_connections.auth_user_id=p_user AND google_calendar_connections.organizer_email=p_primary THEN google_calendar_connections.calendar_id ELSE 'primary' END,
        busy_calendar_ids=CASE WHEN google_calendar_connections.auth_user_id=p_user AND google_calendar_connections.organizer_email=p_primary THEN google_calendar_connections.busy_calendar_ids ELSE ARRAY['primary'] END;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.google_select_calendars(p_user uuid,p_calendar text,p_busy text[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE organizer public.google_calendar_connections;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('theastrokaur_google_organizer',0));
  SELECT * INTO organizer FROM public.google_calendar_connections WHERE id FOR UPDATE;
  IF organizer.auth_user_id IS DISTINCT FROM p_user OR NOT EXISTS(SELECT 1 FROM public.customer_profiles WHERE auth_user_id=p_user AND role='admin' AND account_status='active') THEN RAISE EXCEPTION 'Connect your administrator account as the organizer before selecting calendars'; END IF;
  IF COALESCE(NULLIF(organizer.calendar_id,'primary'),organizer.organizer_email) IS DISTINCT FROM p_calendar THEN
    PERFORM public.google_require_no_commitments();
    UPDATE public.availability_settings SET booking_enabled=false WHERE id;
  END IF;
  UPDATE public.google_calendar_connections SET calendar_id=p_calendar,busy_calendar_ids=p_busy,updated_at=now() WHERE id;
END $$;

CREATE OR REPLACE FUNCTION public.google_begin_disconnect(p_user uuid,p_version uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE connection public.google_user_connections;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('theastrokaur_google_organizer',0));
  IF EXISTS(SELECT 1 FROM public.google_calendar_connections WHERE id AND auth_user_id=p_user) THEN
    PERFORM public.google_require_no_commitments();
    UPDATE public.availability_settings SET booking_enabled=false WHERE id;
    UPDATE public.google_calendar_connections SET status='disconnecting' WHERE id;
  END IF;
  SELECT * INTO connection FROM public.google_user_connections WHERE auth_user_id=p_user FOR UPDATE;
  IF connection.auth_user_id IS NULL OR connection.token_version<>p_version OR connection.status='disconnected' THEN RETURN false; END IF;
  UPDATE public.google_user_connections SET status='disconnecting',encrypted_access_token=NULL,access_expires_at=NULL,updated_at=now() WHERE auth_user_id=p_user;
  RETURN true;
END $$;
CREATE OR REPLACE FUNCTION public.google_finish_disconnect(p_user uuid,p_version uuid,p_revoked boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('theastrokaur_google_organizer',0));
  UPDATE public.google_user_connections SET status='disconnected',encrypted_refresh_token=NULL,encrypted_access_token=NULL,access_expires_at=NULL,granted_scopes='{}',updated_at=now(),
    last_error=CASE WHEN p_revoked THEN NULL ELSE 'Disconnected locally. Google revocation could not be confirmed; remove app access from your Google account.' END
    WHERE auth_user_id=p_user AND token_version=p_version AND status='disconnecting';
  IF FOUND THEN
    UPDATE public.google_calendar_connections SET auth_user_id=NULL,encrypted_refresh_token='',organizer_email=NULL,status='disconnected',last_error=NULL WHERE id AND auth_user_id=p_user;
  END IF;
END $$;
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'google_%' LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
  END LOOP;
END $$;
COMMIT;
