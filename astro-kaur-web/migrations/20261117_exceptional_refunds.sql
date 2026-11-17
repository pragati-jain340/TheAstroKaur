BEGIN;

-- Server-only payment operations. A refund never changes a booking or reservation.
CREATE TABLE IF NOT EXISTS public.booking_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  stripe_refund_id text UNIQUE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL,
  status text NOT NULL CHECK (status IN ('processing','pending','requires_action','succeeded','failed','canceled')),
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 3 AND 1000),
  actor uuid,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS booking_refunds_one_unsubmitted ON public.booking_refunds(order_id) WHERE status='processing';
ALTER TABLE public.booking_refunds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_refunds FROM anon, authenticated;
GRANT ALL ON public.booking_refunds TO service_role;

-- Preserve refunds already recorded by the previous implementation.
INSERT INTO public.booking_refunds(order_id,stripe_refund_id,amount_cents,currency,status,reason)
SELECT id,stripe_refund_id,refunded_amount_cents,lower(coalesce(currency_snapshot,'eur')),'succeeded','Previously recorded Stripe refund'
FROM public.orders WHERE stripe_refund_id LIKE 're\_%' ESCAPE '\' AND refunded_amount_cents>0
ON CONFLICT(stripe_refund_id) DO NOTHING;

ALTER TABLE public.booking_jobs ADD COLUMN IF NOT EXISTS refund_id uuid REFERENCES public.booking_refunds(id);
ALTER TABLE public.booking_jobs ADD COLUMN IF NOT EXISTS refund_status text;
ALTER TABLE public.booking_jobs DROP CONSTRAINT IF EXISTS booking_jobs_kind_check;
ALTER TABLE public.booking_jobs ADD CONSTRAINT booking_jobs_kind_check CHECK (kind IN ('calendar','customer','owner','reminder','cancelled','rescheduled','request','schedule_owner','availability_customer','refund','cancelled_owner','rescheduled_owner','refund_owner','payment_received'));

CREATE OR REPLACE FUNCTION public.booking_begin_refund(p_order uuid,p_actor uuid,p_reason text,p_amount integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders; r public.booking_refunds;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id=p_order FOR UPDATE;
  IF NOT FOUND OR o.payment_verified_at IS NULL OR o.stripe_payment_intent_id IS NULL OR o.payment_status<>'paid' THEN RAISE EXCEPTION 'A verified paid order is required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.customer_profiles WHERE auth_user_id=p_actor AND role='admin' AND account_status='active') THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 3 AND 1000 THEN RAISE EXCEPTION 'Enter a refund reason (3 to 1000 characters)'; END IF;
  SELECT * INTO r FROM public.booking_refunds WHERE order_id=p_order AND status IN ('processing','pending','requires_action') ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN RETURN to_jsonb(r); END IF;
  IF p_amount IS NULL OR p_amount<=0 OR p_amount<>o.price_cents_snapshot-coalesce(o.refunded_amount_cents,0) THEN RAISE EXCEPTION 'Refundable balance changed. Refresh this booking before confirming'; END IF;
  INSERT INTO public.booking_refunds(order_id,amount_cents,currency,status,reason,actor)
  VALUES(p_order,p_amount,lower(o.currency_snapshot),'processing',trim(p_reason),p_actor) RETURNING * INTO r;
  UPDATE public.orders SET refund_status='processing',updated_at=now() WHERE id=o.id;
  INSERT INTO public.booking_change_log(order_id,action,actor,reason) VALUES(p_order,'refund_requested',p_actor,trim(p_reason));
  RETURN to_jsonb(r);
END $$;

CREATE OR REPLACE FUNCTION public.booking_sync_refund(p_intent text,p_refund text,p_amount integer,p_currency text,p_status text,p_request uuid DEFAULT NULL,p_failure text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders; r public.booking_refunds; prior text; total integer; state text;
BEGIN
  SELECT * INTO o FROM public.orders WHERE stripe_payment_intent_id=p_intent AND payment_verified_at IS NOT NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Verified payment not found'; END IF;
  IF p_refund NOT LIKE 're\_%' ESCAPE '\' OR p_amount<=0 OR p_amount>o.price_cents_snapshot OR lower(p_currency)<>lower(o.currency_snapshot)
    OR p_status NOT IN ('pending','requires_action','succeeded','failed','canceled') THEN RAISE EXCEPTION 'Refund does not match the verified payment'; END IF;
  SELECT * INTO r FROM public.booking_refunds WHERE stripe_refund_id=p_refund FOR UPDATE;
  IF FOUND AND r.order_id<>o.id THEN RAISE EXCEPTION 'Refund belongs to a different order'; END IF;
  IF r.id IS NULL AND p_request IS NOT NULL THEN
    SELECT * INTO r FROM public.booking_refunds WHERE id=p_request AND order_id=o.id AND (stripe_refund_id IS NULL OR stripe_refund_id=p_refund) FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Refund request does not match this order'; END IF;
  END IF;
  prior:=r.status;
  -- An earlier pending delivery cannot overwrite an already terminal result.
  IF prior IN ('succeeded','failed','canceled') AND p_status IN ('pending','requires_action') THEN RETURN; END IF;
  IF r.id IS NULL THEN
    INSERT INTO public.booking_refunds(order_id,stripe_refund_id,amount_cents,currency,status,reason,failure_reason)
    VALUES(o.id,p_refund,p_amount,lower(p_currency),p_status,'Refund issued from Stripe dashboard',p_failure) RETURNING * INTO r;
  ELSE
    UPDATE public.booking_refunds SET stripe_refund_id=p_refund,amount_cents=p_amount,status=p_status,failure_reason=p_failure,updated_at=now() WHERE id=r.id RETURNING * INTO r;
  END IF;
  SELECT coalesce(sum(amount_cents),0) INTO total FROM public.booking_refunds WHERE order_id=o.id AND status='succeeded';
  IF total>o.price_cents_snapshot THEN RAISE EXCEPTION 'Recorded refunds exceed the original payment. Review Stripe before continuing'; END IF;
  SELECT status INTO state FROM public.booking_refunds WHERE order_id=o.id AND status IN ('processing','pending','requires_action') ORDER BY created_at DESC LIMIT 1;
  state:=coalesce(state,CASE WHEN total>=o.price_cents_snapshot THEN 'refunded' WHEN total>0 THEN 'partially_refunded' ELSE p_status END);
  UPDATE public.orders SET stripe_refund_id=p_refund,refunded_amount_cents=total,refund_status=state,
    payment_status=CASE WHEN total>=o.price_cents_snapshot THEN 'refunded' ELSE 'paid' END,updated_at=now() WHERE id=o.id;
  IF prior IS DISTINCT FROM p_status THEN
    INSERT INTO public.booking_change_log(order_id,action,actor,reason) VALUES(o.id,'refund_'||p_status,r.actor,r.reason||' | Stripe '||p_refund||' | '||p_amount||' '||upper(p_currency)||' minor units');
    INSERT INTO public.booking_jobs(order_id,kind,version,dedupe_key,refund_id,refund_status)
    VALUES(o.id,'refund',o.booking_version,'refund:'||p_refund||':'||p_status,r.id,p_status) ON CONFLICT(dedupe_key) DO NOTHING;
  END IF;
  IF p_status='succeeded' THEN UPDATE public.booking_requests SET status='resolved' WHERE order_id=o.id; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.booking_reject_refund(p_request uuid,p_failure text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.booking_refunds;
BEGIN
  UPDATE public.booking_refunds SET status='failed',failure_reason=left(p_failure,1000),updated_at=now()
  WHERE id=p_request AND stripe_refund_id IS NULL AND status='processing' RETURNING * INTO r;
  IF FOUND THEN
    UPDATE public.orders SET refund_status=CASE WHEN refunded_amount_cents>0 THEN 'partially_refunded' ELSE 'failed' END,updated_at=now() WHERE id=r.order_id;
    INSERT INTO public.booking_change_log(order_id,action,actor,reason) VALUES(r.order_id,'refund_rejected',r.actor,'Stripe rejected the refund request. '||left(p_failure,1000));
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.booking_begin_refund(uuid,uuid,text,integer),public.booking_sync_refund(text,text,integer,text,text,uuid,text),public.booking_reject_refund(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.booking_begin_refund(uuid,uuid,text,integer),public.booking_sync_refund(text,text,integer,text,text,uuid,text),public.booking_reject_refund(uuid,text) TO service_role;
-- Keep service fulfilment independent from refunding the payment.
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
    IF (o.status<>'confirmed' AND NOT (p_admin AND o.status='awaiting_schedule')) OR o.payment_verified_at IS NULL THEN RAISE EXCEPTION 'Active verified booking required'; END IF;
    IF NOT p_admin AND (o.format<>'voice_call' OR o.scheduled_at<=now()) THEN RAISE EXCEPTION 'Please contact support for changes'; END IF;
    v := o.booking_version+1;
    UPDATE public.orders SET status='cancelled',cancelled_at=now(),cancelled_by=p_actor,cancellation_reason=p_reason,booking_version=v,updated_at=now() WHERE id=o.id;
    UPDATE public.booking_reservations SET state='cancelled',updated_at=now() WHERE order_id=o.id;
    UPDATE public.reading_details SET status='cancelled',meet_url=NULL,calendar_sync_status=CASE WHEN o.format='voice_call' THEN 'pending' ELSE 'not_required' END WHERE order_id=o.id;
    IF o.format='voice_call' THEN PERFORM public.booking_enqueue(o.id,'calendar',v); END IF;
    PERFORM public.booking_enqueue(o.id,'cancelled',v);
  ELSIF p_action IN ('pending','birth_details_received','in_progress','delivered') AND p_admin THEN
    IF o.payment_status NOT IN ('paid','refunded') OR o.status IN ('cancelled','expired','payment_review','pending_payment','awaiting_schedule') THEN RAISE EXCEPTION 'Paid active reading required'; END IF;
    UPDATE public.reading_details SET status=p_action,delivered_at=CASE WHEN p_action='delivered' THEN COALESCE(delivered_at,now()) ELSE NULL END WHERE order_id=o.id;
    UPDATE public.orders SET status=CASE WHEN p_action='delivered' THEN 'completed' ELSE 'confirmed' END,updated_at=now() WHERE id=o.id;
  ELSE RAISE EXCEPTION 'Unsupported booking action'; END IF;
  INSERT INTO public.booking_change_log(order_id,action,actor,previous_start,new_start,reason) VALUES(o.id,p_action,p_actor,o.scheduled_at,p_start,p_reason);
  SELECT * INTO o FROM public.orders WHERE id=p_order;
  RETURN to_jsonb(o);
END $$;


CREATE OR REPLACE FUNCTION public.booking_schedule_paid(p_order uuid,p_actor uuid,p_start timestamptz,p_admin boolean DEFAULT false,p_timezone text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders; cfg public.availability_settings; v integer;
BEGIN
  -- ponytail: one organizer lock serializes slot claims; shard by organizer if multiple organizers are added.
  PERFORM pg_advisory_xact_lock(hashtextextended('booking:primary',0));
  SELECT * INTO o FROM public.orders WHERE id=p_order FOR UPDATE;
  IF NOT FOUND OR (NOT p_admin AND o.auth_user_id IS DISTINCT FROM p_actor) THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF p_admin AND NOT EXISTS(SELECT 1 FROM public.customer_profiles WHERE auth_user_id=p_actor AND role='admin' AND account_status='active') THEN RAISE EXCEPTION 'Admin required'; END IF;
  IF p_timezone IS NOT NULL AND NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=p_timezone) THEN RAISE EXCEPTION 'Invalid time zone'; END IF;
  IF o.status='confirmed' AND o.scheduled_at=p_start THEN RETURN to_jsonb(o); END IF;
  IF o.format<>'voice_call' OR o.booking_flow<>'payment_first' OR o.status<>'awaiting_schedule' OR o.payment_status NOT IN ('paid','refunded') OR o.payment_verified_at IS NULL THEN RAISE EXCEPTION 'Paid call awaiting scheduling required'; END IF;
  IF p_start IS NULL OR o.duration_minutes_snapshot NOT IN (30,45) OR NOT (CASE WHEN p_admin THEN public.booking_slot_allowed_admin(p_start,o.duration_minutes_snapshot) ELSE public.booking_slot_allowed(p_start,o.duration_minutes_snapshot) END) THEN RAISE EXCEPTION 'Appointment is no longer available'; END IF;
  SELECT * INTO cfg FROM public.availability_settings WHERE id;
  INSERT INTO public.booking_reservations(order_id,starts_at,ends_at,blocked_until,state)
    VALUES(o.id,p_start,p_start+make_interval(mins=>o.duration_minutes_snapshot),p_start+make_interval(mins=>o.duration_minutes_snapshot+cfg.buffer_minutes),'confirmed');
  v:=o.booking_version+1;
  UPDATE public.orders SET status='confirmed',scheduled_at=p_start,scheduled_end_at=p_start+make_interval(mins=>o.duration_minutes_snapshot),
    original_scheduled_at=p_start,booking_confirmed_at=now(),booking_version=v,customer_timezone=COALESCE(p_timezone,customer_timezone),updated_at=now() WHERE id=o.id;
  UPDATE public.reading_details SET calendar_sync_status='pending',calendar_invitation_status='pending' WHERE order_id=o.id;
  PERFORM public.booking_enqueue(o.id,'calendar',v);
  PERFORM public.booking_enqueue(o.id,'customer',v);
  PERFORM public.booking_enqueue(o.id,'owner',v);
  PERFORM public.booking_enqueue(o.id,'reminder',v,greatest(now(),p_start-interval '1 hour'));
  INSERT INTO public.booking_change_log(order_id,action,actor,new_start) VALUES(o.id,'schedule',p_actor,p_start);
  SELECT * INTO o FROM public.orders WHERE id=p_order;
  RETURN to_jsonb(o);
END $$;
COMMIT;
