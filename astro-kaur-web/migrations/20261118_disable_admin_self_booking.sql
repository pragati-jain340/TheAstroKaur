BEGIN;
CREATE OR REPLACE FUNCTION public.booking_block_admin_self_purchase()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.auth_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.customer_profiles WHERE auth_user_id=NEW.auth_user_id AND role='admin'
  ) THEN
    RAISE EXCEPTION 'Admin accounts cannot make paid bookings. Use the admin workspace to manage customer bookings';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.booking_block_admin_self_purchase() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS prevent_admin_self_purchase ON public.orders;
CREATE TRIGGER prevent_admin_self_purchase BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.booking_block_admin_self_purchase();
COMMIT;
