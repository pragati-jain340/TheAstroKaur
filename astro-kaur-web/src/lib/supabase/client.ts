/**
 * Supabase BROWSER client — use in Client Components only.
 * Uses the publishable key (safe to expose in the browser).
 * Creates a singleton so only one client instance exists per page load.
 */
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://qdnwmfriilknnwqrepuy.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_Kw1CeeB0uG8cpmdMDRYzSw_toXIE2RF'
  return createBrowserClient<Database>(url, key)
}
