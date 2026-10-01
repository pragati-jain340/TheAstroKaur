/**
 * /auth/confirm — Magic-link & OTP callback handler.
 *
 * Supabase sends the user here after they click the magic-link email.
 * This route exchanges the token_hash for a real session, then
 * redirects the user to the intended destination (or home).
 *
 * Supabase Dashboard → Authentication → URL Configuration:
 *   Site URL:        http://localhost:3000          (dev)
 *   Redirect URLs:   http://localhost:3000/auth/confirm
 */
import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  if (token_hash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      // Redirect to the originally requested page (or home)
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Redirect to error page if verification fails
  return NextResponse.redirect(`${origin}/auth/login?error=invalid_token`)
}
