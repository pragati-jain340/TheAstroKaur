import test from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { proxy as updateSession } from '../src/proxy'
import { withRequestTimeout } from '../src/lib/requestTimeout'

function request(path: string, session = false) {
  const request = new NextRequest(`https://example.com${path}`)
  if (session) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://qdnwmfriilknnwqrepuy.supabase.co'
    const value = {
      access_token: 'test-access-token', refresh_token: 'test-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: 'test-user' }, token_type: 'bearer',
    }
    request.cookies.set(`sb-${new URL(url).hostname.split('.')[0]}-auth-token`,
      `base64-${Buffer.from(JSON.stringify(value)).toString('base64url')}`)
  }
  return request
}

test('anonymous public requests never contact Supabase; admin requests require login', async t => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected network request') })
  assert.equal((await updateSession(request('/'))).headers.get('x-middleware-next'), '1')
  const response = await updateSession(request('/admin/calendar'))
  assert.equal(response.status, 307)
  assert.equal(new URL(response.headers.get('location')!).searchParams.get('next'), '/admin/calendar')
})

test('verified sessions can continue to admin routes', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ id: 'test-user' }))
  assert.equal((await updateSession(request('/admin', true))).headers.get('x-middleware-next'), '1')
})

test('invalid sessions redirect admins to login', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json(
    { message: 'Invalid token', code: 'bad_jwt' }, { status: 401 },
  ))
  assert.equal((await updateSession(request('/admin', true))).status, 307)
})

test('refreshed session cookies reach both the request and response', async t => {
  const req = request('/admin', true)
  const cookie = req.cookies.getAll()[0]
  const oldSession = JSON.parse(Buffer.from(cookie.value.slice(7), 'base64url').toString())
  req.cookies.set(cookie.name, `base64-${Buffer.from(JSON.stringify({
    ...oldSession, expires_at: 1,
  })).toString('base64url')}`)
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    if (String(input).includes('/token')) {
      return Response.json({ ...oldSession, access_token: 'refreshed-token', expires_in: 3600 })
    }
    return Response.json({ id: 'test-user' })
  })
  const response = await updateSession(req)
  assert.equal(response.headers.get('x-middleware-next'), '1')
  assert.ok(response.cookies.getAll().some(c => c.name.startsWith(cookie.name)))
  assert.notEqual(req.cookies.get(cookie.name)?.value, cookie.value)
})

test('an Auth outage lets public pages load but denies admin access within the deadline', async t => {
  let aborted = 0
  t.mock.method(console, 'warn', () => {})
  t.mock.method(globalThis, 'fetch', (_input: unknown, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => { aborted++; reject(new Error('aborted')) }, { once: true })
    }))
  const start = Date.now()
  const [publicResponse, adminResponse] = await Promise.all([
    updateSession(request('/', true)), updateSession(request('/admin', true)),
  ])
  assert.ok(Date.now() - start < 6000)
  assert.equal(aborted, 2)
  assert.equal(publicResponse.headers.get('x-middleware-next'), '1')
  assert.equal(publicResponse.cookies.getAll().length, 0)
  assert.equal(adminResponse.status, 503)
  assert.equal(adminResponse.headers.get('cache-control'), 'no-store')
})

test('deadline also bounds operations that ignore cancellation', async () => {
  let signal: AbortSignal | undefined
  await assert.rejects(withRequestTimeout(s => {
    signal = s
    return new Promise<never>(() => {})
  }, 20), /timed out/)
  assert.equal(signal?.aborted, true)
  assert.equal(await withRequestTimeout(async () => 'ok', 1000), 'ok')
})
