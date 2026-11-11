-- Migration: 20261111_email_otp_verifications.sql
-- Description: Stores temporary hashed OTPs for email verification during signup, password reset, and password change.

CREATE TABLE IF NOT EXISTS public.email_otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('signup', 'reset_password', 'change_password')),
    attempts INT NOT NULL DEFAULT 0,
    metadata JSONB,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_otp_lookup ON public.email_otp_verifications (email, purpose);
CREATE INDEX IF NOT EXISTS idx_email_otp_expires ON public.email_otp_verifications (expires_at);

-- Row Level Security: No public access; only backend service_role key can read/write.
ALTER TABLE public.email_otp_verifications ENABLE ROW LEVEL SECURITY;
