/**
 * Supabase SERVER client — use in Server Components, Route Handlers,
 * and Server Actions. Reads and writes cookies for session management.
 * Must be called inside a request context (never at module level).
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

export async function createClient() {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://qdnwmfriilknnwqrepuy.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_Kw1CeeB0uG8cpmdMDRYzSw_toXIE2RF'

  return createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // setAll() called from a Server Component — safe to ignore.
            // The middleware will refresh the session.
          }
        },
      },
    },
  )
}
