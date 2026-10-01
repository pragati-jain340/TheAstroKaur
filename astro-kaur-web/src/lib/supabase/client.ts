/**
 * Supabase BROWSER client — use in Client Components only.
 * Uses the publishable key (safe to expose in the browser).
 * Creates a singleton so only one client instance exists per page load.
 */
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}
