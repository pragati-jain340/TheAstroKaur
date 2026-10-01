/**
 * Supabase session refresh helper for Next.js Middleware.
 * Must be called on every request so the server session stays fresh.
 * @supabase/ssr requires this pattern — without it, the access-token
 * cookie goes stale and server-side auth calls silently fail.
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './types'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY)!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANT: do not add any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake can make sessions hard to debug.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect admin routes — redirect to login if not authenticated
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  if (isAdminRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // IMPORTANT: return supabaseResponse, not NextResponse.next().
  // If you create a new response object, you must copy all cookies over.
  return supabaseResponse
}
