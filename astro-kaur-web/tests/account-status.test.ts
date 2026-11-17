import test from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { AccountStatusError, changeAccountStatus } from '../src/lib/admin/accountStatus'

const target = { id: 'profile-one', auth_user_id: '11111111-1111-4111-8111-111111111111', role: 'customer', account_status: 'active' as const }
const actor = '22222222-2222-4222-8222-222222222222'
function client() { return createClient('https://account-test.invalid', 'test-secret', { auth: { persistSession: false, autoRefreshToken: false } }) }

test('deactivation blocks Auth sign-in and saves the matching profile status', async t => {
  const calls: string[] = []
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input))
    const body = JSON.parse(String(init?.body))
    if (url.pathname.includes('/auth/')) {
      assert.equal(url.pathname, `/auth/v1/admin/users/${target.auth_user_id}`)
      assert.equal(body.ban_duration, '876000h')
      calls.push('auth')
      return Response.json({ id: target.auth_user_id })
    }
    assert.equal(url.searchParams.get('id'), `eq.${target.id}`)
    assert.equal(body.account_status, 'deactivated')
    calls.push('profile')
    return Response.json({ ...target, ...body })
  })
  const result = await changeAccountStatus(client(), target, 'deactivated', actor)
  assert.equal(result.account_status, 'deactivated')
  assert.deepEqual(calls, ['auth', 'profile'])
})

test('reactivation removes the Auth ban and restores active status', async t => {
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    if (String(input).includes('/auth/')) {
      assert.equal(JSON.parse(String(init?.body)).ban_duration, 'none')
      return Response.json({ id: target.auth_user_id })
    }
    return Response.json({ ...target, account_status: 'active' })
  })
  assert.equal((await changeAccountStatus(client(), { ...target, account_status: 'deactivated' }, 'active', actor)).account_status, 'active')
})

test('self-deactivation and invalid statuses never contact the backend', async t => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected backend call') })
  await assert.rejects(changeAccountStatus(client(), target, 'deactivated', target.auth_user_id), (error: unknown) => error instanceof AccountStatusError && error.status === 403)
  await assert.rejects(changeAccountStatus(client(), target, 'deleted', actor), /valid account status/)
})

test('the last active administrator cannot be deactivated', async t => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async (_input: unknown, init?: RequestInit) => {
    calls++
    assert.equal(init?.method, 'HEAD')
    return new Response(null, { headers: { 'content-range': '0-0/1' } })
  })
  await assert.rejects(changeAccountStatus(client(), { ...target, role: 'admin' }, 'deactivated', actor), /last active administrator/)
  assert.equal(calls, 1)
})

test('failure to verify administrators fails closed', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ message: 'Unavailable' }, { status: 403 }))
  await assert.rejects(changeAccountStatus(client(), { ...target, role: 'admin' }, 'suspended', actor), /verify active administrators/)
})

test('an Auth failure leaves the profile unchanged', async t => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    calls++
    assert.ok(String(input).includes('/auth/'))
    return Response.json({ msg: 'Auth unavailable' }, { status: 403 })
  })
  await assert.rejects(changeAccountStatus(client(), target, 'deactivated', actor), /No profile changes/)
  assert.equal(calls, 1)
})

test('profile failure restores the previous sign-in access', async t => {
  const bans: string[] = []
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    if (String(input).includes('/auth/')) {
      bans.push(JSON.parse(String(init?.body)).ban_duration)
      return Response.json({ id: target.auth_user_id })
    }
    return Response.json({ message: 'Profile unavailable' }, { status: 403 })
  })
  await assert.rejects(changeAccountStatus(client(), target, 'deactivated', actor), /previous sign-in access was restored/)
  assert.deepEqual(bans, ['876000h', 'none'])
})
