/**
 * /auth/login — Magic-link login page.
 * Sends a one-time magic link to the user'"'"'s email.
 * Used by both customers and the admin (astrologer).
 */
'use client'

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import SubpageBackground from '@/components/layout/SubpageBackground'

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
    <main className="relative flex min-h-screen items-center justify-center bg-[#FAF8F5] dark:bg-[#0F172A] px-4 selection:bg-[#E5B842]/30 selection:text-[#0F172A]">
      <SubpageBackground />
      <Card className="relative z-10 w-full max-w-sm rounded-2xl bg-white/95 dark:bg-[#131F33]/95 backdrop-blur-md p-6 sm:p-8 shadow-xl border border-[#E5B842]/20">
        <CardHeader className="p-0 pb-6">
          <CardTitle className="text-2xl font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
            Sign in to TheAstroKaur
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a magic link — no password needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {status === 'sent' ? (
            <div className="rounded-lg bg-[#E5B842]/10 border border-[#E5B842]/30 p-4 text-center text-[#0F172A] dark:text-[#FAF8F5]">
              <p className="font-medium">Check your inbox ✉️</p>
              <p className="mt-1 text-sm text-muted-foreground">
                A sign-in link has been sent to <strong>{email}</strong>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full"
                />
              </div>

              {status === 'error' && (
                <p role="alert" className="text-sm text-destructive">{errorMsg}</p>
              )}

              <Button
                type="submit"
                disabled={status === 'loading'}
                className="w-full"
              >
                {status === 'loading' ? 'Sending…' : 'Send magic link'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
