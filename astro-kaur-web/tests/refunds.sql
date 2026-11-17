-- Synthetic fixtures only. The runner always rolls these checks back.
DO $$
DECLARE customer uuid:=gen_random_uuid(); admin_user uuid:=gen_random_uuid(); service uuid:=gen_random_uuid();
  first_order jsonb; second_order jsonb; request jsonb; repeat_request jsonb; current_order public.orders;
  start_at timestamptz:=date_trunc('day',now())+interval '1 day 12 hours';
  intent text:='pi_refund_'||gen_random_uuid()::text; second_intent text:='pi_cancel_'||gen_random_uuid()::text;
  refund_id text:='re_synthetic_'||gen_random_uuid()::text; job_count integer;
  intake jsonb:='{"email":"refund-test@example.invalid","client_name":"Synthetic refund customer","client_dob":"1990-01-01","client_tob":"12:00","client_pob":"Test city"}';
BEGIN
  INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(customer,'refund-customer-'||customer||'@example.invalid','{}'),(admin_user,'refund-admin-'||admin_user||'@example.invalid','{}');
  INSERT INTO public.customer_profiles(auth_user_id,email,role,account_status) VALUES(customer,'refund-customer-'||customer||'@example.invalid','customer','active'),(admin_user,'refund-admin-'||admin_user||'@example.invalid','admin','active') ON CONFLICT(auth_user_id) DO UPDATE SET role=excluded.role,account_status='active';
  INSERT INTO public.services(id,title,description,format,duration_minutes,price_cents,currency,is_active) VALUES(service,'Synthetic refund reading','Test','voice_call',30,2000,'EUR',true);
  UPDATE public.availability_settings SET booking_enabled=true,timezone='UTC',buffer_minutes=15,slot_step_minutes=20,min_notice_minutes=15,advance_window_days=30;
  DELETE FROM public.availability_windows; DELETE FROM public.availability_overrides;
  INSERT INTO public.availability_windows(weekday,start_local,end_local) SELECT day_number,'00:00','23:59' FROM generate_series(0,6) AS days(day_number);
  WHILE EXISTS(SELECT 1 FROM public.booking_reservations WHERE state IN ('held','confirmed') AND tstzrange(starts_at,blocked_until,'[)') && tstzrange(start_at,start_at+interval '3 hours','[)')) LOOP start_at:=start_at+interval '3 hours'; END LOOP;
  first_order:=public.booking_create_purchase(customer,service,intake,start_at,'UTC',gen_random_uuid(),'refund-test');
  UPDATE public.orders SET stripe_checkout_session_id='cs_refund_test' WHERE id=(first_order->>'id')::uuid;
  PERFORM public.booking_settle((first_order->>'id')::uuid,'cs_refund_test',intent,2000,'eur','evt_refund_'||customer,true);
  request:=public.booking_begin_refund((first_order->>'id')::uuid,admin_user,'Approved synthetic exception',2000);
  repeat_request:=public.booking_begin_refund((first_order->>'id')::uuid,admin_user,'Repeated click',2000);
  IF request->>'id'<>repeat_request->>'id' THEN RAISE EXCEPTION 'Repeated submission created a new operation'; END IF;
  BEGIN
    PERFORM public.booking_begin_refund((first_order->>'id')::uuid,customer,'Unapproved customer action',2000);
    RAISE EXCEPTION 'Customer issued a refund';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM='Customer issued a refund' THEN RAISE; END IF; END;
  PERFORM public.booking_sync_refund(intent,refund_id,2000,'eur','pending',(request->>'id')::uuid,NULL);
  SELECT * INTO current_order FROM public.orders WHERE id=(first_order->>'id')::uuid;
  IF current_order.payment_status<>'paid' OR current_order.status<>'confirmed' OR current_order.refund_status<>'pending' OR current_order.refunded_amount_cents<>0 THEN RAISE EXCEPTION 'Pending refund reported as completed or cancelled'; END IF;
  PERFORM public.booking_sync_refund(intent,refund_id,2000,'eur','succeeded',(request->>'id')::uuid,NULL);
  SELECT * INTO current_order FROM public.orders WHERE id=(first_order->>'id')::uuid;
  IF current_order.payment_status<>'refunded' OR current_order.status<>'confirmed' OR current_order.refunded_amount_cents<>2000 THEN RAISE EXCEPTION 'Refund unexpectedly changed booking status'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.booking_reservations WHERE order_id=current_order.id AND state='confirmed') THEN RAISE EXCEPTION 'Refund released the reservation'; END IF;
  SELECT count(*) INTO job_count FROM public.booking_jobs WHERE order_id=current_order.id AND kind='refund';
  PERFORM public.booking_sync_refund(intent,refund_id,2000,'eur','succeeded',(request->>'id')::uuid,NULL);
  PERFORM public.booking_sync_refund(intent,refund_id,2000,'eur','pending',(request->>'id')::uuid,NULL);
  IF (SELECT refund_status FROM public.orders WHERE id=current_order.id)<>'refunded' THEN RAISE EXCEPTION 'Old pending event regressed a completed refund'; END IF;
  IF (SELECT count(*) FROM public.booking_jobs WHERE order_id=current_order.id AND kind='refund')<>job_count THEN RAISE EXCEPTION 'Duplicate event queued another notification'; END IF;
  PERFORM public.booking_change(current_order.id,admin_user,'cancel',NULL,'Separate synthetic cancellation',true);
  IF (SELECT payment_status FROM public.orders WHERE id=current_order.id)<>'refunded' THEN RAISE EXCEPTION 'Cancellation changed financial state'; END IF;
  second_order:=public.booking_create_purchase(customer,service,intake,start_at+interval '2 hours','UTC',gen_random_uuid(),'refund-test');
  UPDATE public.orders SET stripe_checkout_session_id='cs_cancel_test' WHERE id=(second_order->>'id')::uuid;
  PERFORM public.booking_settle((second_order->>'id')::uuid,'cs_cancel_test',second_intent,2000,'eur','evt_cancel_'||customer,true);
  PERFORM public.booking_change((second_order->>'id')::uuid,admin_user,'cancel',NULL,'Synthetic cancellation without refund',true);
  SELECT * INTO current_order FROM public.orders WHERE id=(second_order->>'id')::uuid;
  IF current_order.status<>'cancelled' OR current_order.payment_status<>'paid' OR current_order.refunded_amount_cents<>0 OR EXISTS(SELECT 1 FROM public.booking_refunds WHERE order_id=current_order.id) THEN RAISE EXCEPTION 'Cancellation issued a refund'; END IF;
  IF has_table_privilege('authenticated','public.booking_refunds','SELECT') OR has_function_privilege('authenticated','public.booking_begin_refund(uuid,uuid,text,integer)','EXECUTE') THEN RAISE EXCEPTION 'Refund ledger exposed to customers'; END IF;
END $$;
SELECT 'passed: independent cancellation/refund, pending/success status, duplicate requests/events, reservation retention, admin authorization and grants' AS refund_tests;
