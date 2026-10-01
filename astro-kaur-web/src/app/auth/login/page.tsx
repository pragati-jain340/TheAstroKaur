/**
 * /auth/login — Magic-link login page.
 * Sends a one-time magic link to the user'"'"'s email.
 * Used by both customers and the admin (astrologer).
 */
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // After clicking the link, the user lands on /auth/confirm
        emailRedirectTo: `${siteUrl}/auth/confirm`,
        shouldCreateUser: true,
      },
    })

    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
    } else {
      setStatus('sent')
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F2E9] px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-2xl font-semibold text-[#263D35]">
          Sign in to TheAstroKaur
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          Enter your email and we'"'"'ll send you a magic link — no password needed.
        </p>

        {status === 'sent' ? (
          <div className="rounded-lg bg-[#263D35]/10 p-4 text-center text-[#263D35]">
            <p className="font-medium">Check your inbox ✉️</p>
            <p className="mt-1 text-sm text-gray-600">
              A sign-in link has been sent to <strong>{email}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#C6A66B] focus:outline-none focus:ring-2 focus:ring-[#C6A66B]/30"
              />
            </div>

            {status === 'error' && (
              <p className="text-sm text-red-600">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full rounded-lg bg-[#263D35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#263D35]/90 disabled:opacity-60"
            >
              {status === 'loading' ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
