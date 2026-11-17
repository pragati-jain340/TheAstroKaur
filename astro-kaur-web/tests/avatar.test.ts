import test from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { BUCKET_NAME, saveUserAvatar } from '../src/lib/avatar/imageToWebP'

const userId = 'newly-signed-in-user'
const photo = new Blob(['test image'], { type: 'image/webp' })
function client() {
  return createClient('https://avatar-test.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

test('signup photo is uploaded and linked to the user returned by sign-in', async t => {
  const requests: string[] = []
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input))
    requests.push(url.pathname)
    if (url.pathname.startsWith('/storage/')) {
      assert.equal(url.pathname, `/storage/v1/object/${BUCKET_NAME}/${userId}/avatar.webp`)
      return Response.json({ Key: `${BUCKET_NAME}/${userId}/avatar.webp` })
    }
    assert.equal(init?.method, 'PATCH')
    assert.equal(url.searchParams.get('auth_user_id'), `eq.${userId}`)
    const update = JSON.parse(String(init?.body))
    assert.equal(update.avatar_seed, null)
    assert.match(update.avatar_url, new RegExp(`/storage/v1/object/public/${BUCKET_NAME}/${userId}/avatar.webp`))
    return Response.json({ auth_user_id: userId, ...update })
  })
  const saved = await saveUserAvatar(client(), userId, photo)
  assert.equal(saved.error, null)
  assert.equal(saved.profile?.auth_user_id, userId)
  assert.ok(saved.profile?.avatar_url)
  assert.equal(requests.length, 2)
})

test('storage rejection is returned for retry without attempting a profile update', async t => {
  let requests = 0
  t.mock.method(console, 'error', () => {})
  t.mock.method(globalThis, 'fetch', async () => {
    requests++
    return Response.json({ statusCode: '403', error: 'Forbidden', message: 'Upload denied' }, { status: 403 })
  })
  const saved = await saveUserAvatar(client(), userId, photo)
  assert.match(saved.error!, /Upload denied/)
  assert.equal(saved.profile, null)
  assert.equal(requests, 1)
})

test('an uploaded photo is not reported as saved when the profile write fails', async t => {
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    if (String(input).includes('/storage/')) return Response.json({ Key: 'uploaded' })
    return Response.json({ message: 'Profile update denied', code: '42501' }, { status: 403 })
  })
  const saved = await saveUserAvatar(client(), userId, photo)
  assert.equal(saved.error, 'Profile update denied')
  assert.equal(saved.profile, null)
})

test('a missing customer profile cannot silently succeed', async t => {
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    if (String(input).includes('/storage/')) return Response.json({ Key: 'uploaded' })
    return Response.json({ message: 'No matching profile', code: 'PGRST116' }, { status: 406 })
  })
  const saved = await saveUserAvatar(client(), userId, photo)
  assert.equal(saved.error, 'No matching profile')
  assert.equal(saved.profile, null)
})
