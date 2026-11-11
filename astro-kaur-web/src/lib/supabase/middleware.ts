/**
 * Supabase session refresh helper for the Next.js request proxy.
 * Refresh existing sessions without letting Auth outages block public pages.
 * @supabase/ssr requires this pattern — without it, the access-token
 * cookie goes stale and server-side auth calls silently fail.
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './types'
import { withRequestTimeout } from '../requestTimeout'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://qdnwmfriilknnwqrepuy.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_Kw1CeeB0uG8cpmdMDRYzSw_toXIE2RF'

  const pathname = request.nextUrl.pathname
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/')
  const loginRedirect = () => {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('next', pathname)
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach(cookie => response.cookies.set(cookie))
    return response
  }
  const cookieName = `sb-${new URL(url).hostname.split('.')[0]}-auth-token`
  const hasSession = request.cookies.getAll().some(({ name }) =>
    name === cookieName || name.startsWith(`${cookieName}.`),
  )
  if (!hasSession) return isAdminRoute ? loginRedirect() : supabaseResponse

  let acceptingCookies = true
  try {
    const { data: { user }, error } = await withRequestTimeout(async signal => {
      const supabase = createServerClient<Database>(
        url,
        key,
        {
          global: {
            fetch: (input, init) => fetch(input, { ...init, signal }),
          },
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              // An SDK retry must not mutate cookies after the deadline has passed.
              if (!acceptingCookies || signal.aborted) return
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
      return await supabase.auth.getUser()
    }, 4000)

    // Protect admin routes — redirect to login if not authenticated
    if (isAdminRoute && !user) {
      if (error && (error.status === 0 || (error.status ?? 0) >= 500)) throw error
      return loginRedirect()
    }
  } catch {
    console.warn('Supabase session check unavailable', { pathname })
    if (isAdminRoute) {
      return new NextResponse('Sign-in verification is temporarily unavailable. Please retry shortly.', {
        status: 503,
        headers: { 'Retry-After': '5', 'Cache-Control': 'no-store' },
      })
    }
  } finally {
    acceptingCookies = false
  }

  // IMPORTANT: return supabaseResponse, not NextResponse.next().
  // If you create a new response object, you must copy all cookies over.
  return supabaseResponse
}
