-- =============================================================================
-- TheAstroKaur: Comprehensive Supabase Database Migration & Schema Sync
-- =============================================================================
-- This migration ensures the database matches the application data flow:
-- 1. customer_profiles: role ('customer' | 'admin'), personal & optional partner details
-- 2. orders: reading bookings, payment status, receipts, reviews, client & partner snapshots
-- 3. reading_details: linked to orders.id, snapshot client & partner info for the astrologer
-- 4. auth.users triggers: auto_confirm_new_user & auto_create_customer_profile
-- 5. orders trigger: auto snapshot to reading_details on booking insert
-- 6. Row Level Security: customer access & is_admin() helper
-- =============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CUSTOMER PROFILES (Personal & Partner Info)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    -- Ensure role column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'customer_profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE public.customer_profiles 
        ADD COLUMN role TEXT NOT NULL DEFAULT 'customer';
    END IF;

    -- Ensure account_status column exists with check constraint ('active' | 'suspended' | 'deactivated')
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'customer_profiles' AND column_name = 'account_status'
    ) THEN
        ALTER TABLE public.customer_profiles 
        ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active';

        ALTER TABLE public.customer_profiles 
        ADD CONSTRAINT customer_profiles_account_status_check 
        CHECK (account_status IN ('active', 'suspended', 'deactivated'));
    END IF;

    -- Ensure partner columns exist for relationship & matchmaking readings
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'customer_profiles' AND column_name = 'partner_name'
    ) THEN
        ALTER TABLE public.customer_profiles 
        ADD COLUMN partner_name TEXT,
        ADD COLUMN partner_date_of_birth DATE,
        ADD COLUMN partner_time_of_birth TIME,
        ADD COLUMN partner_time_uncertain BOOLEAN DEFAULT FALSE,
        ADD COLUMN partner_place_of_birth TEXT;
    END IF;

    -- Ensure unique constraint on auth_user_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'customer_profiles_auth_user_id_key'
    ) THEN
        ALTER TABLE public.customer_profiles ADD CONSTRAINT customer_profiles_auth_user_id_key UNIQUE (auth_user_id);
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ORDERS (Bookings, Reviews, Payments & Snapshots)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    -- Payment & Stripe columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'stripe_payment_intent_id'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN stripe_payment_intent_id TEXT;
    END IF;

    -- Review columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'review_rating'
    ) THEN
        ALTER TABLE public.orders 
        ADD COLUMN review_rating INTEGER CHECK (review_rating >= 1 AND review_rating <= 5),
        ADD COLUMN review_text TEXT,
        ADD COLUMN review_created_at TIMESTAMPTZ;
    END IF;

    -- Client snapshot columns at the time of booking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'client_name'
    ) THEN
        ALTER TABLE public.orders 
        ADD COLUMN client_name TEXT,
        ADD COLUMN client_dob DATE,
        ADD COLUMN client_tob TIME,
        ADD COLUMN client_time_uncertain BOOLEAN DEFAULT FALSE,
        ADD COLUMN client_pob TEXT;
    END IF;

    -- Partner snapshot columns at the time of booking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'partner_name'
    ) THEN
        ALTER TABLE public.orders 
        ADD COLUMN requires_partner BOOLEAN DEFAULT FALSE,
        ADD COLUMN partner_name TEXT,
        ADD COLUMN partner_dob DATE,
        ADD COLUMN partner_tob TIME,
        ADD COLUMN partner_time_uncertain BOOLEAN DEFAULT FALSE,
        ADD COLUMN partner_pob TEXT;
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. READING DETAILS (Astrologer Working Record linked to Orders)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    -- Foreign key to orders.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'reading_details' AND column_name = 'order_id'
    ) THEN
        ALTER TABLE public.reading_details 
        ADD COLUMN order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE;
    END IF;

    -- Snapshot client details
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'reading_details' AND column_name = 'client_name'
    ) THEN
        ALTER TABLE public.reading_details 
        ADD COLUMN client_name TEXT,
        ADD COLUMN client_date_of_birth DATE,
        ADD COLUMN client_time_of_birth TIME,
        ADD COLUMN client_time_uncertain BOOLEAN DEFAULT FALSE,
        ADD COLUMN client_place_of_birth TEXT;
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. DATABASE FUNCTIONS & TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

-- Function: is_admin() - Prevents recursive RLS lookups
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.customer_profiles
    WHERE auth_user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Trigger Function: Auto-confirm new users in auth.users
CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_confirm_new_user ON auth.users;
CREATE TRIGGER trg_auto_confirm_new_user
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_new_user();

-- Trigger Function: Auto-create customer_profiles row upon user signup
-- All new users default strictly to role = 'customer' and account_status = 'active'.
-- Admin promotion is handled explicitly via secure admin operations.
CREATE OR REPLACE FUNCTION public.auto_create_customer_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.customer_profiles (
    auth_user_id,
    email,
    display_name,
    role,
    account_status,
    avatar_seed,
    date_of_birth,
    time_of_birth,
    place_of_birth,
    time_uncertain
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'customer',
    'active',
    COALESCE(NEW.raw_user_meta_data->>'avatar_seed', 'star'),
    NULLIF(NEW.raw_user_meta_data->>'date_of_birth', '')::date,
    NULLIF(NEW.raw_user_meta_data->>'time_of_birth', '')::time,
    NULLIF(NEW.raw_user_meta_data->>'place_of_birth', ''),
    COALESCE((NEW.raw_user_meta_data->>'time_uncertain')::boolean, false)
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_create_customer_profile ON auth.users;
CREATE TRIGGER trg_auto_create_customer_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_customer_profile();

-- Trigger Function: Order-to-Reading Details Snapshot
CREATE OR REPLACE FUNCTION public.create_reading_details_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.reading_details (
    order_id,
    customer_id,
    service_id,
    client_name,
    client_date_of_birth,
    client_time_of_birth,
    client_time_uncertain,
    client_place_of_birth,
    partner_name,
    partner_date_of_birth,
    partner_time_of_birth,
    partner_time_uncertain,
    partner_place_of_birth,
    google_calendar_event_id,
    status
  )
  SELECT
    NEW.id,
    cp.id,
    s.id,
    NEW.client_name,
    NEW.client_dob,
    NEW.client_tob,
    COALESCE(NEW.client_time_uncertain, FALSE),
    NEW.client_pob,
    NEW.partner_name,
    NEW.partner_dob,
    NEW.partner_tob,
    COALESCE(NEW.partner_time_uncertain, FALSE),
    NEW.partner_pob,
    '',
    'pending'
  FROM public.customer_profiles cp
  LEFT JOIN public.services s ON s.title = NEW.service_title
  WHERE cp.auth_user_id = NEW.auth_user_id
  LIMIT 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_reading_details ON public.orders;
CREATE TRIGGER trg_create_reading_details
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_reading_details_on_order();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_details ENABLE ROW LEVEL SECURITY;

-- customer_profiles policies
DROP POLICY IF EXISTS "Customer reads own profile" ON public.customer_profiles;
CREATE POLICY "Customer reads own profile"
  ON public.customer_profiles FOR SELECT
  USING (auth.uid() = auth_user_id OR public.is_admin());

DROP POLICY IF EXISTS "Customer updates own profile" ON public.customer_profiles;
CREATE POLICY "Customer updates own profile"
  ON public.customer_profiles FOR UPDATE
  USING (auth.uid() = auth_user_id OR public.is_admin())
  WITH CHECK (auth.uid() = auth_user_id OR public.is_admin());

DROP POLICY IF EXISTS "Customer inserts own profile" ON public.customer_profiles;
CREATE POLICY "Customer inserts own profile"
  ON public.customer_profiles FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins full access on customer_profiles" ON public.customer_profiles;
CREATE POLICY "Admins full access on customer_profiles"
  ON public.customer_profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- orders policies
DROP POLICY IF EXISTS "Customer reads own orders" ON public.orders;
CREATE POLICY "Customer reads own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = auth_user_id OR public.is_admin());

DROP POLICY IF EXISTS "Customer updates own order reviews" ON public.orders;
CREATE POLICY "Customer updates own order reviews"
  ON public.orders FOR UPDATE
  USING (auth.uid() = auth_user_id OR public.is_admin())
  WITH CHECK (auth.uid() = auth_user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins full access on orders" ON public.orders;
CREATE POLICY "Admins full access on orders"
  ON public.orders FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- reading_details policies
DROP POLICY IF EXISTS "Customer reads own reading details" ON public.reading_details;
CREATE POLICY "Customer reads own reading details"
  ON public.reading_details FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customer_profiles WHERE auth_user_id = auth.uid()
    ) OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admins full access on reading_details" ON public.reading_details;
CREATE POLICY "Admins full access on reading_details"
  ON public.reading_details FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
