-- Wrapped in a rolled-back transaction by the runner. No Stripe calls or emails.
DO $$
DECLARE admin_user uuid:=gen_random_uuid(); customer uuid:=gen_random_uuid(); service uuid:=gen_random_uuid(); result jsonb;
  intake jsonb:='{"email":"booking-guard@example.invalid","client_name":"Synthetic customer","client_dob":"1990-01-01","client_tob":"12:00","client_pob":"Test city"}';
BEGIN
  INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(admin_user,'admin-guard-'||admin_user||'@example.invalid','{}'),(customer,'customer-guard-'||customer||'@example.invalid','{}');
  INSERT INTO public.customer_profiles(auth_user_id,email,role,account_status) VALUES(admin_user,'admin-guard-'||admin_user||'@example.invalid','admin','active'),(customer,'customer-guard-'||customer||'@example.invalid','customer','active') ON CONFLICT(auth_user_id) DO UPDATE SET role=excluded.role,account_status='active';
  INSERT INTO public.services(id,title,description,format,price_cents,currency,is_active) VALUES(service,'Synthetic booking guard reading','Test','text',2000,'EUR',true);
  BEGIN
    PERFORM public.booking_create_payment_first(admin_user,service,intake,NULL,'UTC',gen_random_uuid(),'admin-guard-test');
    RAISE EXCEPTION 'Admin self-purchase was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Admin accounts cannot make paid bookings%' THEN RAISE; END IF;
  END;
  IF EXISTS(SELECT 1 FROM public.orders WHERE auth_user_id=admin_user) THEN RAISE EXCEPTION 'Rejected admin purchase created an order'; END IF;
  result:=public.booking_create_payment_first(customer,service,intake,NULL,'UTC',gen_random_uuid(),'customer-guard-test');
  IF result->>'auth_user_id'<>customer::text OR result->>'status'<>'pending_payment' THEN RAISE EXCEPTION 'Customer booking was affected'; END IF;
END $$;
SELECT 'passed: admin self-purchase rejected without orders, ordinary customer booking remains available' AS admin_booking_tests;
