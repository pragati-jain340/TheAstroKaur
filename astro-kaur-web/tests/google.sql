DO $$
DECLARE admin_user uuid:=gen_random_uuid();customer_user uuid:=gen_random_uuid();o uuid:=gen_random_uuid();v uuid;primary_id text:='synthetic-'||gen_random_uuid()::text||'@example.invalid';
BEGIN
  INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(admin_user,'google-admin-'||admin_user||'@example.invalid','{}'),(customer_user,'google-user-'||customer_user||'@example.invalid','{}');
  UPDATE public.customer_profiles SET role='admin',account_status='active' WHERE auth_user_id=admin_user;
  -- Isolate the singleton within this rolled-back test transaction; no persistent replacement.
  DELETE FROM public.google_calendar_connections WHERE id;
  PERFORM public.google_save_connection(admin_user,primary_id,'g1.synthetic-refresh','g1.synthetic-access',now()+interval '1 hour',ARRAY['synthetic'],true);
  PERFORM public.google_save_connection(customer_user,'other-'||primary_id,'g1.synthetic-refresh-two','g1.synthetic-access-two',now()+interval '1 hour',ARRAY['synthetic'],false);
  IF (SELECT auth_user_id FROM public.google_calendar_connections WHERE id)<>admin_user THEN RAISE EXCEPTION 'Personal connection changed organizer'; END IF;
  IF (SELECT count(*) FROM public.google_user_connections WHERE auth_user_id IN (admin_user,customer_user))<>2 THEN RAISE EXCEPTION 'Per-user binding failed'; END IF;
  BEGIN
    PERFORM public.google_save_connection(customer_user,primary_id,'g1.synthetic-refresh-two','g1.synthetic-access-two',now()+interval '1 hour',ARRAY['synthetic'],false);
    RAISE EXCEPTION 'Google account was bound to two active website users';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    PERFORM public.google_save_connection(customer_user,'other-'||primary_id,'g1.synthetic-refresh-two','g1.synthetic-access-two',now()+interval '1 hour',ARRAY['synthetic'],true);
    RAISE EXCEPTION 'Customer took over organizer';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM='Customer took over organizer' THEN RAISE; END IF; END;
  SELECT token_version INTO v FROM public.google_user_connections WHERE auth_user_id=admin_user;
  INSERT INTO public.orders(id,auth_user_id,service_title,format,price_eur,status,payment_status,payment_verified_at,scheduled_at,scheduled_end_at)
    VALUES(o,admin_user,'Synthetic Google guard test','voice_call',1,'confirmed','paid',now(),now()+interval '1 day',now()+interval '1 day 30 minutes');
  BEGIN
    PERFORM public.google_begin_disconnect(admin_user,v);
    RAISE EXCEPTION 'Organizer disconnected with a paid upcoming call';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM='Organizer disconnected with a paid upcoming call' THEN RAISE; END IF; END;
  DELETE FROM public.orders WHERE id=o;
  -- Any real commitments remain protected by the same guard; this fixture is normally run before booking launch.
  IF NOT EXISTS(SELECT 1 FROM public.orders WHERE format='voice_call' AND status='confirmed' AND payment_verified_at IS NOT NULL AND COALESCE(scheduled_end_at,scheduled_at)>now())
    AND NOT EXISTS(SELECT 1 FROM public.booking_reservations WHERE state='held' AND blocked_until>now()) THEN
    IF NOT public.google_begin_disconnect(admin_user,v) THEN RAISE EXCEPTION 'Disconnection lease failed'; END IF;
    BEGIN
      PERFORM public.google_save_connection(admin_user,primary_id,'g1.synthetic-refresh','g1.synthetic-access',now()+interval '1 hour',ARRAY['synthetic'],true);
      RAISE EXCEPTION 'Connection was replaced during revocation';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM='Connection was replaced during revocation' THEN RAISE; END IF; END;
    PERFORM public.google_finish_disconnect(admin_user,v,true);
    IF EXISTS(SELECT 1 FROM public.google_user_connections WHERE auth_user_id=admin_user AND (encrypted_refresh_token IS NOT NULL OR encrypted_access_token IS NOT NULL OR status<>'disconnected')) THEN RAISE EXCEPTION 'Disconnected credentials retained'; END IF;
    IF (SELECT status FROM public.google_user_connections WHERE auth_user_id=customer_user)<>'connected' THEN RAISE EXCEPTION 'Disconnect affected another website user'; END IF;
  END IF;
  IF has_table_privilege('authenticated','public.google_user_connections','SELECT') OR has_function_privilege('authenticated','public.google_save_connection(uuid,text,text,text,timestamptz,text[],boolean)','EXECUTE') THEN RAISE EXCEPTION 'Private Google storage or writes exposed'; END IF;
  PERFORM set_config('request.jwt.claim.sub',customer_user::text,true);EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    PERFORM encrypted_refresh_token FROM public.google_user_connections WHERE auth_user_id=admin_user;
    RAISE EXCEPTION 'Customer read another user token';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  EXECUTE 'RESET ROLE';
END $$;
SELECT 'passed: Google user isolation, organizer authorization, account uniqueness, booking/disconnection guards, local token removal and private grants' AS google_tests;
