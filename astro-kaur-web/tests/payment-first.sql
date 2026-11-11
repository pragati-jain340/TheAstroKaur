-- Run against an isolated database with the booking migrations installed.
BEGIN;
DO $$
DECLARE
  customer uuid := gen_random_uuid();
  service uuid := gen_random_uuid();
  first_order jsonb;
  second_order jsonb;
  start_at timestamptz := (date_trunc('day', now() AT TIME ZONE 'Europe/Berlin') + interval '1 day 10 hours') AT TIME ZONE 'Europe/Berlin';
  intake jsonb := '{"email":"test@example.invalid","client_name":"Test Customer","client_dob":"1990-01-01","client_tob":"12:00","client_pob":"Test city"}';
  result text;
BEGIN
  INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(customer,'test-'||customer||'@example.invalid','{}');
  INSERT INTO public.customer_profiles(auth_user_id,email,role,account_status)
    VALUES(customer,'test-'||customer||'@example.invalid','customer','active') ON CONFLICT(auth_user_id) DO NOTHING;
  INSERT INTO public.services(id,title,description,format,duration_minutes,price_cents,currency,is_active,requires_partner_details)
    VALUES(service,'Synthetic consultation','Test','voice_call',45,4200,'EUR',true,false);
  UPDATE public.availability_settings SET booking_enabled=true,timezone='Europe/Berlin',buffer_minutes=15,slot_step_minutes=15;
  DELETE FROM public.availability_windows;
  DELETE FROM public.availability_overrides;
  INSERT INTO public.availability_windows(weekday,start_local,end_local)
    SELECT day_number,'00:00','23:59' FROM generate_series(0,6) AS days(day_number);
  WHILE EXISTS(SELECT 1 FROM public.booking_reservations WHERE state IN ('held','confirmed')
    AND tstzrange(starts_at,blocked_until,'[)') && tstzrange(start_at,start_at+interval '2 hours','[)')) LOOP
    start_at := start_at + interval '2 hours';
  END LOOP;

  first_order:=public.booking_create_payment_first(customer,service,intake,NULL,'Europe/Berlin',gen_random_uuid(),'test');
  IF EXISTS(SELECT 1 FROM public.booking_reservations WHERE order_id=(first_order->>'id')::uuid) THEN
    RAISE EXCEPTION 'Payment-first order reserved a slot';
  END IF;
  UPDATE public.orders SET stripe_checkout_session_id='cs_first' WHERE id=(first_order->>'id')::uuid;
  result:=public.booking_settle((first_order->>'id')::uuid,'cs_first','pi_first',4200,'eur','evt_first',true);
  IF result<>'paid_awaiting_schedule' OR (SELECT status FROM public.orders WHERE id=(first_order->>'id')::uuid)<>'awaiting_schedule' THEN
    RAISE EXCEPTION 'Verified payment did not produce an unscheduled paid order';
  END IF;
  result:=public.booking_settle((first_order->>'id')::uuid,'cs_first','pi_first',4200,'eur','evt_first',true);
  IF result<>'duplicate' THEN RAISE EXCEPTION 'Repeated webhook was not idempotent'; END IF;
  UPDATE public.customer_profiles SET role='admin' WHERE auth_user_id=customer;
  BEGIN
    PERFORM public.booking_change((first_order->>'id')::uuid,customer,'delivered',NULL,NULL,true);
    RAISE EXCEPTION 'Unscheduled call was marked delivered';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='Unscheduled call was marked delivered' THEN RAISE; END IF;
  END;
  UPDATE public.customer_profiles SET role='customer' WHERE auth_user_id=customer;

  UPDATE public.availability_settings SET buffer_minutes=15;
  IF NOT EXISTS(SELECT 1 FROM public.booking_jobs WHERE order_id=(first_order->>'id')::uuid AND kind='availability_customer') THEN
    RAISE EXCEPTION 'Availability change did not queue a customer check';
  END IF;

  second_order:=public.booking_create_payment_first(customer,service,intake,NULL,'Europe/Berlin',gen_random_uuid(),'test');
  UPDATE public.orders SET stripe_checkout_session_id='cs_second' WHERE id=(second_order->>'id')::uuid;
  PERFORM public.booking_settle((second_order->>'id')::uuid,'cs_second','pi_second',4200,'eur','evt_second',true);
  UPDATE public.services SET duration_minutes=30 WHERE id=service;
  PERFORM public.booking_schedule_paid((first_order->>'id')::uuid,customer,start_at,false,'Asia/Kolkata');
  IF (SELECT scheduled_end_at-scheduled_at FROM public.orders WHERE id=(first_order->>'id')::uuid)<>interval '45 minutes' THEN
    RAISE EXCEPTION 'Booked duration did not preserve the purchase snapshot';
  END IF;
  IF (SELECT customer_timezone FROM public.orders WHERE id=(first_order->>'id')::uuid)<>'Asia/Kolkata' THEN
    RAISE EXCEPTION 'Chosen customer time zone was not saved';
  END IF;
  BEGIN
    PERFORM public.booking_schedule_paid((second_order->>'id')::uuid,customer,start_at,false,NULL);
    RAISE EXCEPTION 'Overlapping appointment was accepted';
  EXCEPTION WHEN exclusion_violation THEN NULL;
  END;
  IF (SELECT status FROM public.orders WHERE id=(second_order->>'id')::uuid)<>'awaiting_schedule' THEN
    RAISE EXCEPTION 'Rejected overlap changed the paid order';
  END IF;
  start_at := start_at + interval '30 days';
  BEGIN
    PERFORM public.booking_schedule_paid((second_order->>'id')::uuid,customer,start_at,false,NULL);
    RAISE EXCEPTION 'Customer scheduled outside the booking window';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='Customer scheduled outside the booking window' THEN RAISE; END IF;
  END;
  UPDATE public.customer_profiles SET role='admin' WHERE auth_user_id=customer;
  PERFORM public.booking_schedule_paid((second_order->>'id')::uuid,customer,start_at,true,NULL);
  IF (SELECT scheduled_at FROM public.orders WHERE id=(second_order->>'id')::uuid) IS DISTINCT FROM start_at THEN
    RAISE EXCEPTION 'Admin could not schedule beyond the customer window';
  END IF;
END $$;
ROLLBACK;
