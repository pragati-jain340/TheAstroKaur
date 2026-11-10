-- Synthetic fixtures only. The runner wraps every test in ROLLBACK.
DO $$
DECLARE u uuid:=gen_random_uuid();svc uuid:=gen_random_uuid();txt uuid:=gen_random_uuid();
  key1 uuid:=gen_random_uuid();key2 uuid:=gen_random_uuid();o jsonb;other jsonb;written jsonb;late_order jsonb;
  start_at timestamptz; replacement timestamptz; intake jsonb; outcome text; n integer;
BEGIN
  INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(u,'booking-test-'||u||'@example.invalid','{}');
  INSERT INTO public.customer_profiles(auth_user_id,email,role,account_status) VALUES(u,'booking-test-'||u||'@example.invalid','customer','active') ON CONFLICT(auth_user_id) DO NOTHING;
  INSERT INTO public.services(id,title,description,format,duration_minutes,price_cents,currency,is_active) VALUES(svc,'Synthetic test consultation','Synthetic','voice_call',45,4200,'EUR',true),(txt,'Synthetic written test','Synthetic','text',NULL,1700,'EUR',true);
  UPDATE public.availability_settings SET booking_enabled=true,timezone='Europe/Berlin',buffer_minutes=15,slot_step_minutes=15;
  DELETE FROM public.availability_windows;DELETE FROM public.availability_overrides;
  INSERT INTO public.availability_windows(weekday,start_local,end_local) SELECT day_number,'00:00','23:59' FROM generate_series(0,6) AS days(day_number);
  start_at := (date_trunc('day',now() AT TIME ZONE 'Europe/Berlin')+interval '1 day 10 hours') AT TIME ZONE 'Europe/Berlin';
  -- Avoid colliding with genuine bookings without modifying them.
  WHILE EXISTS(SELECT 1 FROM public.booking_reservations WHERE state IN ('held','confirmed') AND tstzrange(starts_at,blocked_until,'[)') && tstzrange(start_at,start_at+interval '3 hours','[)')) LOOP start_at:=start_at+interval '3 hours'; END LOOP;
  replacement:=start_at+interval '90 minutes';
  intake:=jsonb_build_object('email','booking-test@example.invalid','client_name','Synthetic customer','client_dob','1990-01-01','client_tob','12:00','client_pob','Test city','client_time_uncertain',false);
  o:=public.booking_create_purchase(u,svc,intake,start_at,'Asia/Calcutta',key1,'test');
  IF o->>'status'<>'pending_payment' OR (o->>'price_cents_snapshot')::integer<>4200 THEN RAISE EXCEPTION 'Pending/price snapshot failed'; END IF;
  IF (public.booking_create_purchase(u,svc,intake,start_at,'Asia/Calcutta',key1,'test')->>'id')<>(o->>'id') THEN RAISE EXCEPTION 'Purchase idempotency failed'; END IF;
  BEGIN
    PERFORM public.booking_create_purchase(u,svc,intake,start_at+interval '15 minutes','Europe/Berlin',key2,'test');
    RAISE EXCEPTION 'Overlap was accepted';
  EXCEPTION WHEN exclusion_violation THEN NULL; END;
  IF (SELECT count(*) FROM public.reading_details WHERE order_id=(o->>'id')::uuid)<>1 THEN RAISE EXCEPTION 'Snapshot trigger failed'; END IF;
  UPDATE public.orders SET stripe_checkout_session_id='cs_test_'||key1 WHERE id=(o->>'id')::uuid;
  BEGIN
    PERFORM public.booking_settle((o->>'id')::uuid,'cs_test_'||key1,'pi_test_wrong',1,'eur','evt_wrong',true);
    RAISE EXCEPTION 'Wrong amount was accepted';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM='Wrong amount was accepted' THEN RAISE; END IF; END;
  outcome:=public.booking_settle((o->>'id')::uuid,'cs_test_'||key1,'pi_test_'||key1,4200,'eur','evt_'||key1,true);
  IF outcome<>'paid' THEN RAISE EXCEPTION 'Payment settlement failed'; END IF;
  outcome:=public.booking_settle((o->>'id')::uuid,'cs_test_'||key1,'pi_test_'||key1,4200,'eur','evt_'||key1,true);
  IF outcome<>'duplicate' THEN RAISE EXCEPTION 'Webhook idempotency failed'; END IF;
  PERFORM public.booking_settle((o->>'id')::uuid,'cs_test_'||key1,NULL,4200,'eur','evt_expired_'||key1,false);
  IF (SELECT payment_status FROM public.orders WHERE id=(o->>'id')::uuid)<>'paid' THEN RAISE EXCEPTION 'Out-of-order expiration regressed payment'; END IF;
  SELECT count(*) INTO n FROM public.booking_jobs WHERE order_id=(o->>'id')::uuid;
  IF n<>4 THEN RAISE EXCEPTION 'Expected four initial call jobs, got %',n; END IF;
  -- A failed acquisition rolls back and leaves the original reservation intact.
  other:=public.booking_create_purchase(u,svc,intake,replacement,'Europe/Berlin',key2,'test');
  BEGIN
    PERFORM public.booking_change((o->>'id')::uuid,u,'reschedule',replacement,NULL,false);
    RAISE EXCEPTION 'Conflicting reschedule was accepted';
  EXCEPTION WHEN exclusion_violation THEN NULL; END;
  IF (SELECT starts_at FROM public.booking_reservations WHERE order_id=(o->>'id')::uuid)<>start_at THEN RAISE EXCEPTION 'Failed reschedule lost original'; END IF;
  IF (SELECT reschedule_count FROM public.orders WHERE id=(o->>'id')::uuid)<>0 THEN RAISE EXCEPTION 'Failed attempt consumed reschedule'; END IF;
  PERFORM public.booking_change((o->>'id')::uuid,u,'reschedule',replacement+interval '90 minutes',NULL,false);
  IF (SELECT reschedule_count FROM public.orders WHERE id=(o->>'id')::uuid)<>1 THEN RAISE EXCEPTION 'Reschedule count failed'; END IF;
  BEGIN
    PERFORM public.booking_change((o->>'id')::uuid,u,'reschedule',start_at,NULL,false);
    RAISE EXCEPTION 'Second reschedule accepted';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM='Second reschedule accepted' THEN RAISE; END IF; END;
  PERFORM public.booking_change((o->>'id')::uuid,u,'cancel',NULL,'Synthetic cancellation',false);
  IF (SELECT payment_status FROM public.orders WHERE id=(o->>'id')::uuid)<>'paid' THEN RAISE EXCEPTION 'Cancellation altered payment'; END IF;
  IF (SELECT state FROM public.booking_reservations WHERE order_id=(o->>'id')::uuid)<>'cancelled' THEN RAISE EXCEPTION 'Cancellation failed to release'; END IF;
  written:=public.booking_create_purchase(u,txt,intake,NULL,'Europe/Berlin',gen_random_uuid(),'test');
  IF EXISTS(SELECT 1 FROM public.booking_reservations WHERE order_id=(written->>'id')::uuid) THEN RAISE EXCEPTION 'Written order has reservation'; END IF;
  UPDATE public.orders SET stripe_checkout_session_id='cs_test_written_'||key1 WHERE id=(written->>'id')::uuid;
  PERFORM public.booking_settle((written->>'id')::uuid,'cs_test_written_'||key1,'pi_test_written_'||key1,1700,'eur','evt_written_'||key1,true);
  IF EXISTS(SELECT 1 FROM public.booking_jobs WHERE order_id=(written->>'id')::uuid AND kind IN ('calendar','reminder')) THEN RAISE EXCEPTION 'Written order has calendar work'; END IF;
  IF (SELECT status FROM public.reading_details WHERE order_id=(written->>'id')::uuid)='delivered' THEN RAISE EXCEPTION 'Payment marked written delivered'; END IF;
  IF (written->>'hold_expires_at')::timestamptz<now()+interval '23 hours' THEN RAISE EXCEPTION 'Written checkout incorrectly uses call hold deadline'; END IF;
  UPDATE public.customer_profiles SET role='admin' WHERE auth_user_id=u;
  PERFORM public.booking_change((written->>'id')::uuid,u,'delivered',NULL,'Synthetic manual delivery',true);
  IF (SELECT delivered_at FROM public.reading_details WHERE order_id=(written->>'id')::uuid) IS NULL OR (SELECT status FROM public.orders WHERE id=(written->>'id')::uuid)<>'completed' THEN RAISE EXCEPTION 'Manual fulfillment failed'; END IF;
  UPDATE public.customer_profiles SET role='customer' WHERE auth_user_id=u;
  PERFORM public.booking_record_refund('pi_test_written_'||key1,'re_test_'||key1,1700,u);
  IF (SELECT payment_status FROM public.orders WHERE id=(written->>'id')::uuid)<>'refunded' THEN RAISE EXCEPTION 'Verified refund did not reconcile'; END IF;
  -- A clock-expired hold with a possibly payable session must still exclude overlaps.
  UPDATE public.booking_reservations SET hold_expires_at=now()-interval '1 minute' WHERE order_id=(other->>'id')::uuid;
  BEGIN
    PERFORM public.booking_create_purchase(u,svc,intake,replacement,'Europe/Berlin',gen_random_uuid(),'test');
    RAISE EXCEPTION 'Clock-expired hold was silently released';
  EXCEPTION WHEN exclusion_violation THEN NULL; END;
  -- Safe expiry of checkout never initiated; a later unexpected payment is preserved for review.
  UPDATE public.orders SET stripe_checkout_session_id='cs_delayed_'||key1,hold_expires_at=now()-interval '1 minute' WHERE id=(other->>'id')::uuid;
  outcome:=public.booking_settle((other->>'id')::uuid,'cs_delayed_'||key1,'pi_delayed_'||key1,4200,'eur','evt_delayed_'||key1,true,now()-interval '2 minutes');
  IF outcome<>'paid' THEN RAISE EXCEPTION 'Payment started before deadline was lost due to webhook delay'; END IF;
  late_order:=public.booking_create_purchase(u,svc,intake,start_at,'Europe/Berlin',gen_random_uuid(),'test');
  UPDATE public.orders SET hold_expires_at=now()-interval '1 minute' WHERE id=(late_order->>'id')::uuid;
  IF public.booking_begin_checkout((late_order->>'id')::uuid) THEN RAISE EXCEPTION 'Expired purchase could start checkout'; END IF;
  IF NOT public.booking_expire_unstarted((late_order->>'id')::uuid) THEN RAISE EXCEPTION 'Unstarted expired checkout was retained'; END IF;
  UPDATE public.orders SET stripe_checkout_session_id='cs_late_'||key1 WHERE id=(late_order->>'id')::uuid;
  outcome:=public.booking_settle((late_order->>'id')::uuid,'cs_late_'||key1,'pi_late_'||key1,4200,'eur','evt_late_'||key1,true);
  IF outcome<>'manual_review' OR (SELECT status FROM public.orders WHERE id=(late_order->>'id')::uuid)<>'payment_review' THEN RAISE EXCEPTION 'Late payment was lost or silently booked'; END IF;
  late_order:=public.booking_create_purchase(u,svc,intake,start_at,'Europe/Berlin',gen_random_uuid(),'test');
  UPDATE public.orders SET stripe_checkout_session_id='cs_after_deadline_'||key1,hold_expires_at=now()-interval '1 minute' WHERE id=(late_order->>'id')::uuid;
  outcome:=public.booking_settle((late_order->>'id')::uuid,'cs_after_deadline_'||key1,'pi_after_deadline_'||key1,4200,'eur','evt_after_deadline_'||key1,true,now());
  IF outcome<>'manual_review' OR (SELECT state FROM public.booking_reservations WHERE order_id=(late_order->>'id')::uuid)<>'expired' THEN RAISE EXCEPTION 'Payment started after deadline was silently confirmed'; END IF;
  SELECT max(per_order) INTO n FROM (SELECT count(*) AS per_order FROM public.booking_claim_jobs() GROUP BY order_id) claimed;
  IF n>1 THEN RAISE EXCEPTION 'Parallel provider jobs were claimed for the same order'; END IF;
  IF has_table_privilege('authenticated','public.orders','UPDATE') OR has_table_privilege('anon','public.orders','INSERT') THEN RAISE EXCEPTION 'Unsafe order privileges remain'; END IF;
  IF has_function_privilege('authenticated','public.booking_settle(uuid,text,text,integer,text,text,boolean,timestamptz)','EXECUTE') THEN RAISE EXCEPTION 'Settlement callable by customers'; END IF;
  IF has_table_privilege('authenticated','public.reading_private_notes','SELECT') THEN RAISE EXCEPTION 'Private notes are public'; END IF;
  PERFORM set_config('request.jwt.claim.sub',u::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    UPDATE public.customer_profiles SET role='admin' WHERE auth_user_id=u;
    RAISE EXCEPTION 'Role escalation was accepted';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM='Role escalation was accepted' THEN RAISE; END IF; END;
  BEGIN
    UPDATE public.customer_profiles SET account_status='suspended' WHERE auth_user_id=u;
    RAISE EXCEPTION 'Customer changed protected account status';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM='Customer changed protected account status' THEN RAISE; END IF; END;
  UPDATE public.customer_profiles SET place_of_birth='Synthetic editable profile' WHERE auth_user_id=u;
  BEGIN
    UPDATE public.orders SET payment_status='paid' WHERE id=(other->>'id')::uuid;
    RAISE EXCEPTION 'Customer changed payment status';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  EXECUTE 'RESET ROLE';
END $$;
SELECT 'passed: price snapshots, trigger, overlap exclusion, settlement/idempotency, payment ordering, atomic reschedule, cancellation, written flow, grants and role protection' AS booking_tests;
