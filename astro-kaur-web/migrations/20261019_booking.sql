-- Additive booking migration. Apply with the matching application release.
BEGIN;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

ALTER TABLE public.orders
  ALTER COLUMN status SET DEFAULT 'pending_payment',
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS scheduled_end_at timestamptz,
  ADD COLUMN IF NOT EXISTS original_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_timezone text NOT NULL DEFAULT 'Europe/Berlin',
  ADD COLUMN IF NOT EXISTS customer_email_snapshot text,
  ADD COLUMN IF NOT EXISTS price_cents_snapshot integer,
  ADD COLUMN IF NOT EXISTS currency_snapshot text,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS checkout_key uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS checkout_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS hold_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS booking_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reschedule_count integer NOT NULL DEFAULT 0 CHECK (reschedule_count BETWEEN 0 AND 1),
  ADD COLUMN IF NOT EXISTS booking_version integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS refund_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS stripe_refund_id text,
  ADD COLUMN IF NOT EXISTS refunded_amount_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS policy_version text,
  ADD COLUMN IF NOT EXISTS policy_acknowledged_at timestamptz;
ALTER TABLE public.reading_details
  ALTER COLUMN google_calendar_event_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS meet_url text,
  ADD COLUMN IF NOT EXISTS calendar_sync_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS calendar_invitation_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS calendar_synced_version integer NOT NULL DEFAULT -1,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

CREATE TABLE public.availability_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  timezone text NOT NULL DEFAULT 'Europe/Berlin',
  min_notice_minutes integer NOT NULL DEFAULT 15 CHECK (min_notice_minutes BETWEEN 15 AND 10080),
  advance_window_days integer NOT NULL DEFAULT 3 CHECK (advance_window_days BETWEEN 1 AND 90),
  hold_minutes integer NOT NULL DEFAULT 5 CHECK (hold_minutes = 5),
  buffer_minutes integer NOT NULL DEFAULT 15 CHECK (buffer_minutes BETWEEN 0 AND 120),
  slot_step_minutes integer NOT NULL DEFAULT 15 CHECK (slot_step_minutes IN (5,10,15,20,30,60)),
  booking_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.availability_settings(id) VALUES (true);
CREATE TABLE public.availability_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekday integer NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- Sunday=0
  start_local time NOT NULL, end_local time NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  CHECK (end_local > start_local),
  EXCLUDE USING gist (weekday WITH =, numrange(extract(epoch FROM start_local)::numeric, extract(epoch FROM end_local)::numeric, '[)') WITH &&) WHERE (enabled)
);
CREATE TABLE public.availability_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), local_date date NOT NULL,
  mode text NOT NULL CHECK (mode IN ('blocked','extra_open')),
  start_local time, end_local time, note text,
  CHECK ((start_local IS NULL AND end_local IS NULL AND mode='blocked') OR
    (start_local IS NOT NULL AND end_local IS NOT NULL AND end_local > start_local))
);
CREATE TABLE public.booking_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  owner_id text NOT NULL DEFAULT 'primary' CHECK (owner_id='primary'),
  starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, blocked_until timestamptz NOT NULL,
  state text NOT NULL CHECK (state IN ('held','confirmed','expired','cancelled')),
  hold_expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at AND blocked_until >= ends_at),
  EXCLUDE USING gist (owner_id WITH =, tstzrange(starts_at,blocked_until,'[)') WITH &&) WHERE (state IN ('held','confirmed'))
);
CREATE TABLE public.booking_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  action text NOT NULL, actor uuid, previous_start timestamptz, new_start timestamptz,
  reason text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.stripe_webhook_events (
  id text PRIMARY KEY, order_id uuid REFERENCES public.orders(id), outcome text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.booking_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('calendar','customer','owner','reminder','cancelled','rescheduled','request')),
  dedupe_key text NOT NULL UNIQUE, version integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','sent','failed','skipped')),
  run_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz, lease_token uuid,
  attempts integer NOT NULL DEFAULT 0, last_error text, provider_id text, email_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz
);
CREATE INDEX booking_jobs_due ON public.booking_jobs(run_at) WHERE status IN ('pending','processing');
CREATE TABLE public.google_calendar_connections (
  id boolean PRIMARY KEY DEFAULT true CHECK(id), organizer_email text, calendar_id text NOT NULL DEFAULT 'primary',
  busy_calendar_ids text[] NOT NULL DEFAULT ARRAY['primary'], encrypted_refresh_token text NOT NULL,
  status text NOT NULL DEFAULT 'connected', last_success_at timestamptz, last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.orders(id),
  actor uuid NOT NULL, kind text NOT NULL CHECK (kind IN ('withdrawal','refund')),
  reason text NOT NULL, status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id,kind)
);

-- Database protection applies even if a customer calls REST directly.
CREATE OR REPLACE FUNCTION public.protect_customer_identity() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF current_user IN ('anon','authenticated') THEN
    IF TG_OP='INSERT' AND (NEW.role <> 'customer' OR NEW.account_status <> 'active' OR NEW.auth_user_id IS DISTINCT FROM auth.uid()) THEN
      RAISE EXCEPTION 'Profile identity is managed by the server';
    END IF;
    IF TG_OP='UPDATE' AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.account_status IS DISTINCT FROM OLD.account_status
      OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id OR NEW.id IS DISTINCT FROM OLD.id OR NEW.email IS DISTINCT FROM OLD.email) THEN
      RAISE EXCEPTION 'Profile identity is managed by the server';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_customer_identity BEFORE INSERT OR UPDATE ON public.customer_profiles FOR EACH ROW EXECUTE FUNCTION public.protect_customer_identity();

-- Move private notes out of the customer-readable table, retaining admin UI compatibility via server reads.
CREATE TABLE public.reading_private_notes (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  admin_notes text, updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.reading_private_notes(order_id,admin_notes)
  SELECT order_id,admin_notes FROM public.reading_details WHERE order_id IS NOT NULL AND admin_notes IS NOT NULL
  ON CONFLICT(order_id) DO NOTHING;
UPDATE public.reading_details SET admin_notes=NULL WHERE admin_notes IS NOT NULL;
REVOKE INSERT, UPDATE, DELETE ON public.orders FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.reading_details FROM anon, authenticated;
-- Keep snapshot trigger, resolving new purchases by ID and legacy orders by title.
CREATE OR REPLACE FUNCTION public.handle_order_reading_details_snapshot() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_customer_id uuid; v_service_id uuid;
BEGIN
  SELECT id INTO v_customer_id FROM public.customer_profiles WHERE auth_user_id=NEW.auth_user_id LIMIT 1;
  v_service_id := NEW.service_id;
  IF v_service_id IS NULL THEN SELECT id INTO v_service_id FROM public.services WHERE title ILIKE NEW.service_title LIMIT 1; END IF;
  INSERT INTO public.reading_details(order_id,customer_id,service_id,client_name,client_date_of_birth,client_time_of_birth,
    client_time_uncertain,client_place_of_birth,partner_name,partner_date_of_birth,partner_time_of_birth,partner_time_uncertain,partner_place_of_birth,google_calendar_event_id,status)
  VALUES(NEW.id,v_customer_id,v_service_id,NEW.client_name,NEW.client_dob,NEW.client_tob,NEW.client_time_uncertain,NEW.client_pob,
    NEW.partner_name,NEW.partner_dob,NEW.partner_tob,NEW.partner_time_uncertain,NEW.partner_pob,NULL,'pending') ON CONFLICT(order_id) DO NOTHING;
  RETURN NEW;
END $$;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['availability_settings','availability_windows','availability_overrides','booking_reservations','booking_change_log','stripe_webhook_events','booking_jobs','google_calendar_connections','booking_requests','reading_private_notes'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.booking_slot_allowed(p_start timestamptz,p_duration integer) RETURNS boolean LANGUAGE plpgsql STABLE SET search_path=public AS $$
DECLARE s public.availability_settings; l timestamp; r timestamp;
BEGIN
  SELECT * INTO s FROM public.availability_settings WHERE id;
  l := p_start AT TIME ZONE s.timezone;
  r := (p_start + make_interval(mins=>p_duration+s.buffer_minutes)) AT TIME ZONE s.timezone;
  IF NOT s.booking_enabled OR p_duration NOT IN (30,45) OR p_start < now()+make_interval(mins=>s.min_notice_minutes)
    OR l > (now() AT TIME ZONE s.timezone)+make_interval(days=>s.advance_window_days)
    OR l::date <> r::date OR extract(second FROM l) <> 0 OR extract(minute FROM l)::integer % s.slot_step_minutes <> 0 THEN RETURN false; END IF;
  IF NOT (EXISTS(SELECT 1 FROM public.availability_windows w WHERE w.enabled AND w.weekday=extract(dow FROM l)
      AND l::time>=w.start_local AND r::time<=w.end_local)
    OR EXISTS(SELECT 1 FROM public.availability_overrides o WHERE o.mode='extra_open' AND o.local_date=l::date AND l::time>=o.start_local AND r::time<=o.end_local)) THEN RETURN false; END IF;
  IF EXISTS(SELECT 1 FROM public.availability_overrides o WHERE o.mode='blocked' AND o.local_date=l::date
    AND (o.start_local IS NULL OR (l::time<o.end_local AND r::time>o.start_local))) THEN RETURN false; END IF;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.booking_create_purchase(p_user uuid,p_service uuid,p_intake jsonb,p_start timestamptz,p_timezone text,p_key uuid,p_policy text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.services; cfg public.availability_settings; o public.orders; deadline timestamptz;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  SELECT * INTO o FROM public.orders WHERE checkout_key=p_key;
  IF FOUND THEN
    IF o.auth_user_id<>p_user OR o.service_id<>p_service THEN RAISE EXCEPTION 'Invalid checkout request'; END IF;
    RETURN to_jsonb(o);
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.customer_profiles WHERE auth_user_id=p_user AND account_status='active') THEN RAISE EXCEPTION 'Active customer account required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=p_timezone) THEN RAISE EXCEPTION 'Invalid time zone'; END IF;
  SELECT * INTO s FROM public.services WHERE id=p_service AND is_active FOR SHARE;
  IF NOT FOUND OR s.price_cents<=0 OR upper(s.currency)<>'EUR' THEN RAISE EXCEPTION 'Service unavailable'; END IF;
  SELECT * INTO cfg FROM public.availability_settings WHERE id FOR SHARE;
  IF s.format='voice_call' AND (p_start IS NULL OR NOT public.booking_slot_allowed(p_start,s.duration_minutes)) THEN RAISE EXCEPTION 'Appointment is no longer available'; END IF;
  IF s.format='text' AND p_start IS NOT NULL THEN RAISE EXCEPTION 'Written readings do not have appointments'; END IF;
  IF (SELECT count(*) FROM public.orders WHERE auth_user_id=p_user AND status='pending_payment' AND created_at>now()-interval '30 minutes')>=3 THEN RAISE EXCEPTION 'Please complete or wait for your pending checkout'; END IF;
  deadline := now()+interval '5 minutes';
  INSERT INTO public.orders(auth_user_id,service_id,service_title,format,price_eur,status,payment_status,price_cents_snapshot,currency_snapshot,
    customer_email_snapshot,customer_timezone,scheduled_at,scheduled_end_at,original_scheduled_at,hold_expires_at,checkout_key,policy_version,policy_acknowledged_at,
    client_name,client_dob,client_tob,client_pob,client_time_uncertain,requires_partner,partner_name,partner_dob,partner_tob,partner_pob,partner_time_uncertain,notes)
  VALUES(p_user,s.id,s.title,s.format,s.price_cents/100.0,'pending_payment','pending',s.price_cents,lower(s.currency),
    p_intake->>'email',p_timezone,p_start,CASE WHEN p_start IS NOT NULL THEN p_start+make_interval(mins=>s.duration_minutes) END,p_start,deadline,p_key,p_policy,now(),
    p_intake->>'client_name',(p_intake->>'client_dob')::date,NULLIF(p_intake->>'client_tob','')::time,p_intake->>'client_pob',COALESCE((p_intake->>'client_time_uncertain')::boolean,false),
    s.requires_partner_details,CASE WHEN s.requires_partner_details THEN p_intake->>'partner_name' END,
    CASE WHEN s.requires_partner_details THEN (p_intake->>'partner_dob')::date END,CASE WHEN s.requires_partner_details THEN NULLIF(p_intake->>'partner_tob','')::time END,
    CASE WHEN s.requires_partner_details THEN p_intake->>'partner_pob' END,COALESCE((p_intake->>'partner_time_uncertain')::boolean,false),p_intake->>'notes') RETURNING * INTO o;
  IF s.format='voice_call' THEN
    INSERT INTO public.booking_reservations(order_id,starts_at,ends_at,blocked_until,state,hold_expires_at)
    VALUES(o.id,p_start,o.scheduled_end_at,o.scheduled_end_at+make_interval(mins=>cfg.buffer_minutes),'held',deadline);
  END IF;
  RETURN to_jsonb(o);
END $$;

CREATE OR REPLACE FUNCTION public.booking_enqueue(p_order uuid,p_kind text,p_version integer,p_run timestamptz DEFAULT now()) RETURNS void LANGUAGE sql SET search_path=public AS $$
  INSERT INTO public.booking_jobs(order_id,kind,version,dedupe_key,run_at) VALUES(p_order,p_kind,p_version,p_order::text||':'||p_kind||':'||p_version,p_run) ON CONFLICT(dedupe_key) DO NOTHING;
$$;

CREATE OR REPLACE FUNCTION public.booking_settle(p_order uuid,p_session text,p_intent text,p_amount integer,p_currency text,p_event text,p_paid boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders; r public.booking_reservations;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id=p_order FOR UPDATE;
  IF NOT FOUND OR o.stripe_checkout_session_id IS DISTINCT FROM p_session OR o.price_cents_snapshot IS DISTINCT FROM p_amount OR o.currency_snapshot IS DISTINCT FROM lower(p_currency) THEN RAISE EXCEPTION 'Payment does not match order'; END IF;
  IF EXISTS(SELECT 1 FROM public.stripe_webhook_events WHERE id=p_event) THEN RETURN 'duplicate'; END IF;
  IF p_paid THEN
    IF o.payment_verified_at IS NOT NULL THEN
      INSERT INTO public.stripe_webhook_events(id,order_id,outcome) VALUES(p_event,o.id,'already_paid'); RETURN 'already_paid';
    END IF;
    IF p_intent IS NULL THEN RAISE EXCEPTION 'Payment intent required'; END IF;
    IF o.format='voice_call' THEN
      SELECT * INTO r FROM public.booking_reservations WHERE order_id=o.id FOR UPDATE;
    END IF;
    IF o.status<>'pending_payment' OR (o.format='voice_call' AND (r.id IS NULL OR r.state<>'held' OR r.starts_at<=now())) THEN
      UPDATE public.orders SET payment_status='paid',payment_verified_at=now(),stripe_payment_intent_id=p_intent,status='payment_review',refund_status='review_required' WHERE id=o.id;
      PERFORM public.booking_enqueue(o.id,'owner',o.booking_version);
      INSERT INTO public.stripe_webhook_events(id,order_id,outcome) VALUES(p_event,o.id,'manual_review'); RETURN 'manual_review';
    END IF;
    UPDATE public.orders SET payment_status='paid',status='confirmed',payment_verified_at=now(),booking_confirmed_at=now(),stripe_payment_intent_id=p_intent,updated_at=now() WHERE id=o.id;
    UPDATE public.booking_reservations SET state='confirmed',updated_at=now() WHERE order_id=o.id;
    UPDATE public.reading_details SET calendar_sync_status=CASE WHEN o.format='voice_call' THEN 'pending' ELSE 'not_required' END,
      calendar_invitation_status=CASE WHEN o.format='voice_call' THEN 'pending' ELSE 'not_required' END WHERE order_id=o.id;
    IF o.format='voice_call' THEN
      PERFORM public.booking_enqueue(o.id,'calendar',o.booking_version);
      PERFORM public.booking_enqueue(o.id,'reminder',o.booking_version,greatest(now(),o.scheduled_at-interval '1 hour'));
    END IF;
    PERFORM public.booking_enqueue(o.id,'customer',o.booking_version);
    PERFORM public.booking_enqueue(o.id,'owner',o.booking_version);
    INSERT INTO public.stripe_webhook_events(id,order_id,outcome) VALUES(p_event,o.id,'paid'); RETURN 'paid';
  ELSE
    IF o.payment_verified_at IS NULL AND o.status='pending_payment' THEN
      UPDATE public.orders SET status='expired',payment_status='failed',updated_at=now() WHERE id=o.id;
      UPDATE public.booking_reservations SET state='expired',updated_at=now() WHERE order_id=o.id AND state='held';
    END IF;
    INSERT INTO public.stripe_webhook_events(id,order_id,outcome) VALUES(p_event,o.id,'expired'); RETURN 'expired';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.booking_change(p_order uuid,p_actor uuid,p_action text,p_start timestamptz DEFAULT NULL,p_reason text DEFAULT NULL,p_admin boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders; cfg public.availability_settings; duration integer; v integer;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id=p_order FOR UPDATE;
  IF NOT FOUND OR (NOT p_admin AND o.auth_user_id IS DISTINCT FROM p_actor) THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF p_admin AND NOT EXISTS(SELECT 1 FROM public.customer_profiles WHERE auth_user_id=p_actor AND role='admin' AND account_status='active') THEN RAISE EXCEPTION 'Admin required'; END IF;
  IF p_action IN ('withdrawal','refund') THEN
    INSERT INTO public.booking_requests(order_id,actor,kind,reason) VALUES(o.id,p_actor,p_action,COALESCE(p_reason,'')) ON CONFLICT(order_id,kind) DO NOTHING;
    UPDATE public.orders SET refund_status=CASE WHEN refund_status='none' THEN 'requested' ELSE refund_status END WHERE id=o.id;
    PERFORM public.booking_enqueue(o.id,'request',o.booking_version);
  ELSIF p_action='reschedule' THEN
    IF o.format<>'voice_call' OR o.status<>'confirmed' OR o.payment_verified_at IS NULL THEN RAISE EXCEPTION 'Confirmed paid call required'; END IF;
    IF NOT p_admin AND (o.reschedule_count<>0 OR now()>=least(o.booking_confirmed_at+interval '12 hours',o.original_scheduled_at)) THEN RAISE EXCEPTION 'Self-service rescheduling has closed; please contact support'; END IF;
    duration := round(extract(epoch FROM (o.scheduled_end_at-o.scheduled_at))/60)::integer;
    IF p_start IS NULL OR p_start=o.scheduled_at OR NOT public.booking_slot_allowed(p_start,duration) THEN RAISE EXCEPTION 'Replacement time is unavailable'; END IF;
    SELECT * INTO cfg FROM public.availability_settings WHERE id;
    UPDATE public.booking_reservations SET starts_at=p_start,ends_at=p_start+make_interval(mins=>duration),blocked_until=p_start+make_interval(mins=>duration+cfg.buffer_minutes),updated_at=now() WHERE order_id=o.id AND state='confirmed';
    IF NOT FOUND THEN RAISE EXCEPTION 'Confirmed reservation missing'; END IF;
    v := o.booking_version+1;
    UPDATE public.orders SET scheduled_at=p_start,scheduled_end_at=p_start+make_interval(mins=>duration),reschedule_count=least(1,reschedule_count+1),booking_version=v,updated_at=now() WHERE id=o.id;
    UPDATE public.reading_details SET calendar_sync_status='pending',calendar_invitation_status='pending',meet_url=NULL WHERE order_id=o.id;
    PERFORM public.booking_enqueue(o.id,'calendar',v);
    PERFORM public.booking_enqueue(o.id,'rescheduled',v);
    PERFORM public.booking_enqueue(o.id,'reminder',v,greatest(now(),p_start-interval '1 hour'));
  ELSIF p_action='cancel' THEN
    IF o.status='cancelled' THEN RETURN to_jsonb(o); END IF;
    IF o.status<>'confirmed' OR o.payment_verified_at IS NULL THEN RAISE EXCEPTION 'Confirmed paid booking required'; END IF;
    IF NOT p_admin AND (o.format<>'voice_call' OR o.scheduled_at<=now()) THEN RAISE EXCEPTION 'Please contact support for changes'; END IF;
    v := o.booking_version+1;
    UPDATE public.orders SET status='cancelled',cancelled_at=now(),cancelled_by=p_actor,cancellation_reason=p_reason,booking_version=v,updated_at=now() WHERE id=o.id;
    UPDATE public.booking_reservations SET state='cancelled',updated_at=now() WHERE order_id=o.id;
    UPDATE public.reading_details SET status='cancelled',meet_url=NULL,calendar_sync_status=CASE WHEN o.format='voice_call' THEN 'pending' ELSE 'not_required' END WHERE order_id=o.id;
    IF o.format='voice_call' THEN PERFORM public.booking_enqueue(o.id,'calendar',v); END IF;
    PERFORM public.booking_enqueue(o.id,'cancelled',v);
  ELSIF p_action IN ('pending','birth_details_received','in_progress','delivered') AND p_admin THEN
    IF o.payment_status<>'paid' OR o.status IN ('cancelled','expired','payment_review','pending_payment') THEN RAISE EXCEPTION 'Paid active reading required'; END IF;
    UPDATE public.reading_details SET status=p_action,delivered_at=CASE WHEN p_action='delivered' THEN COALESCE(delivered_at,now()) ELSE NULL END WHERE order_id=o.id;
    UPDATE public.orders SET status=CASE WHEN p_action='delivered' THEN 'completed' ELSE 'confirmed' END,updated_at=now() WHERE id=o.id;
  ELSE RAISE EXCEPTION 'Unsupported booking action'; END IF;
  INSERT INTO public.booking_change_log(order_id,action,actor,previous_start,new_start,reason) VALUES(o.id,p_action,p_actor,o.scheduled_at,p_start,p_reason);
  SELECT * INTO o FROM public.orders WHERE id=p_order;
  RETURN to_jsonb(o);
END $$;

CREATE OR REPLACE FUNCTION public.booking_save_availability(p_settings jsonb,p_windows jsonb,p_overrides jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=p_settings->>'timezone') THEN RAISE EXCEPTION 'Invalid time zone'; END IF;
  UPDATE public.availability_settings SET timezone=p_settings->>'timezone',buffer_minutes=(p_settings->>'buffer_minutes')::integer,
    slot_step_minutes=(p_settings->>'slot_step_minutes')::integer,booking_enabled=(p_settings->>'booking_enabled')::boolean,updated_at=now() WHERE id;
  DELETE FROM public.availability_windows;
  INSERT INTO public.availability_windows(weekday,start_local,end_local,enabled) SELECT weekday,start_local,end_local,COALESCE(enabled,true) FROM jsonb_to_recordset(p_windows) AS x(weekday integer,start_local time,end_local time,enabled boolean);
  DELETE FROM public.availability_overrides;
  INSERT INTO public.availability_overrides(local_date,mode,start_local,end_local,note) SELECT local_date,mode,start_local,end_local,left(note,250) FROM jsonb_to_recordset(p_overrides) AS x(local_date date,mode text,start_local time,end_local time,note text);
END $$;

CREATE OR REPLACE FUNCTION public.booking_claim_jobs() RETURNS SETOF public.booking_jobs LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE public.booking_jobs SET status='processing',lease_until=now()+interval '3 minutes',lease_token=gen_random_uuid(),attempts=attempts+1
  WHERE id IN (SELECT id FROM public.booking_jobs WHERE (status='pending' OR (status='processing' AND lease_until<now())) AND run_at<=now() ORDER BY run_at LIMIT 10 FOR UPDATE SKIP LOCKED) RETURNING *;
$$;

CREATE OR REPLACE FUNCTION public.booking_store_calendar(p_order uuid,p_version integer,p_event text,p_meet text,p_invitation text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id=p_order FOR UPDATE;
  IF o.booking_version<>p_version THEN
    INSERT INTO public.booking_jobs(order_id,kind,version,dedupe_key) VALUES(o.id,'calendar',o.booking_version,o.id::text||':repair:'||p_version||':'||o.booking_version) ON CONFLICT(dedupe_key) DO UPDATE SET status='pending',run_at=now();
    RETURN false;
  END IF;
  UPDATE public.reading_details SET google_calendar_event_id=p_event,meet_url=p_meet,calendar_sync_status=CASE WHEN p_meet IS NOT NULL OR o.status='cancelled' THEN 'synced' ELSE 'pending' END,
    calendar_synced_version=CASE WHEN p_meet IS NOT NULL OR o.status='cancelled' THEN p_version ELSE -1 END,calendar_invitation_status=p_invitation WHERE order_id=p_order;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.booking_record_refund(p_intent text,p_refund text,p_amount integer,p_actor uuid DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders;v integer;
BEGIN
  SELECT * INTO o FROM public.orders WHERE stripe_payment_intent_id=p_intent AND payment_verified_at IS NOT NULL FOR UPDATE;
  IF NOT FOUND OR p_amount<=0 OR p_amount>o.price_cents_snapshot THEN RAISE EXCEPTION 'Refund does not match a verified order'; END IF;
  UPDATE public.orders SET stripe_refund_id=p_refund,refunded_amount_cents=greatest(refunded_amount_cents,p_amount),
    refund_status=CASE WHEN p_amount>=price_cents_snapshot THEN 'refunded' ELSE 'partially_refunded' END,
    payment_status=CASE WHEN p_amount>=price_cents_snapshot THEN 'refunded' ELSE payment_status END,updated_at=now() WHERE id=o.id;
  UPDATE public.booking_requests SET status='resolved' WHERE order_id=o.id;
  IF o.stripe_refund_id IS DISTINCT FROM p_refund THEN
    INSERT INTO public.booking_change_log(order_id,action,actor,reason) VALUES(o.id,'refund',p_actor,'Stripe-verified refund of '||p_amount::text||' cents');
  END IF;
  -- A refund alone does not move or cancel an appointment. The owner controls service changes separately.
END $$;

CREATE OR REPLACE FUNCTION public.booking_queue_reconciliation() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  INSERT INTO public.booking_jobs(order_id,kind,version,dedupe_key)
  SELECT id,'calendar',booking_version,id::text||':reconcile:'||booking_version||':'||to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD-HH')
  FROM public.orders WHERE format='voice_call' AND status='confirmed' AND payment_verified_at IS NOT NULL AND scheduled_at>now()
  ON CONFLICT(dedupe_key) DO NOTHING;
$$;

-- Only the trusted backend can invoke transaction functions.
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND (p.proname LIKE 'booking_%' OR p.proname='protect_customer_identity') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
  END LOOP;
END $$;
COMMIT;
