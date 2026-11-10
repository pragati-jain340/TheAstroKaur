-- Payment-expiry hardening and durable email retry timing.
BEGIN;
ALTER TABLE public.booking_jobs ADD COLUMN IF NOT EXISTS email_started_at timestamptz;
ALTER TABLE public.availability_settings ADD COLUMN IF NOT EXISTS worker_last_seen_at timestamptz;
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public STABLE AS $$
  SELECT EXISTS(SELECT 1 FROM public.customer_profiles WHERE auth_user_id=auth.uid() AND role='admin' AND account_status='active');
$$;
-- Replace legacy email-based administrator grants with the protected active role.
DO $$ DECLARE policy record; BEGIN
  FOR policy IN SELECT tablename,policyname FROM pg_policies WHERE schemaname='public' AND cmd='ALL'
    AND tablename IN ('profiles','services','contact_messages','website_notifications','reading_details') AND qual LIKE '%auth.email()%' LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',policy.policyname,policy.tablename);
  END LOOP;
END $$;
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.reading_details'::regclass AND conname='reading_notes_are_private') THEN
    ALTER TABLE public.reading_details ADD CONSTRAINT reading_notes_are_private CHECK(admin_notes IS NULL);
  END IF;
END $$;
-- One external operation per order at a time, including parallel worker invocations.
CREATE OR REPLACE FUNCTION public.booking_claim_jobs() RETURNS SETOF public.booking_jobs LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE public.booking_jobs SET status='processing',lease_until=now()+interval '3 minutes',lease_token=gen_random_uuid(),attempts=attempts+1
  WHERE id IN (
    SELECT j.id FROM public.booking_jobs j WHERE j.id IN (
      SELECT DISTINCT ON (candidate.order_id) candidate.id FROM public.booking_jobs candidate
      WHERE (candidate.status='pending' OR (candidate.status='processing' AND candidate.lease_until<now())) AND candidate.run_at<=now()
        AND NOT EXISTS(SELECT 1 FROM public.booking_jobs active WHERE active.order_id=candidate.order_id AND active.status='processing' AND active.lease_until>now())
      ORDER BY candidate.order_id,candidate.run_at,candidate.id
    ) ORDER BY j.run_at LIMIT 10 FOR UPDATE SKIP LOCKED
  ) RETURNING *;
$$;
DROP FUNCTION IF EXISTS public.booking_settle(uuid,text,text,integer,text,text,boolean);
CREATE OR REPLACE FUNCTION public.booking_settle(p_order uuid,p_session text,p_intent text,p_amount integer,p_currency text,p_event text,p_paid boolean,p_started_at timestamptz DEFAULT NULL)
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
    IF o.status<>'pending_payment' OR (o.format='voice_call' AND (r.id IS NULL OR r.state<>'held' OR r.starts_at<=now() OR COALESCE(p_started_at,now())>o.hold_expires_at)) THEN
      UPDATE public.orders SET payment_status='paid',payment_verified_at=now(),stripe_payment_intent_id=p_intent,status='payment_review',refund_status='review_required' WHERE id=o.id;
      UPDATE public.booking_reservations SET state='expired',updated_at=now() WHERE order_id=o.id AND state='held';
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

REVOKE ALL ON FUNCTION public.booking_settle(uuid,text,text,integer,text,text,boolean,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.booking_settle(uuid,text,text,integer,text,text,boolean,timestamptz) TO service_role;
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
  deadline := CASE WHEN s.format='voice_call' THEN now()+interval '5 minutes' ELSE now()+interval '24 hours' END;
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
    UPDATE public.orders SET scheduled_at=p_start,scheduled_end_at=p_start+make_interval(mins=>duration),reschedule_count=CASE WHEN p_admin THEN reschedule_count ELSE least(1,reschedule_count+1) END,booking_version=v,updated_at=now() WHERE id=o.id;
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

CREATE OR REPLACE FUNCTION public.booking_begin_checkout(p_order uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id=p_order FOR UPDATE;
  IF NOT FOUND OR o.status<>'pending_payment' THEN RETURN false; END IF;
  IF o.checkout_created_at IS NULL THEN
    IF o.hold_expires_at<=now() THEN RETURN false; END IF;
    UPDATE public.orders SET checkout_created_at=now() WHERE id=o.id;
  ELSIF o.checkout_created_at<now()-interval '23 hours' AND o.stripe_checkout_session_id IS NULL THEN
    RAISE EXCEPTION 'Checkout creation needs owner review before retrying';
  END IF;
  RETURN true;
END $$;
CREATE OR REPLACE FUNCTION public.booking_expire_unstarted(p_order uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id=p_order FOR UPDATE;
  IF NOT FOUND OR o.status<>'pending_payment' OR o.checkout_created_at IS NOT NULL OR o.stripe_checkout_session_id IS NOT NULL OR o.hold_expires_at>now() THEN RETURN false; END IF;
  UPDATE public.orders SET status='expired',payment_status='failed',updated_at=now() WHERE id=o.id;
  UPDATE public.booking_reservations SET state='expired',updated_at=now() WHERE order_id=o.id AND state='held';
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.booking_begin_checkout(uuid), public.booking_expire_unstarted(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.booking_begin_checkout(uuid), public.booking_expire_unstarted(uuid) TO service_role;
COMMIT;
