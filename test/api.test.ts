import { describe, expect, it } from 'vitest'
import app from '../src/api'

const env = {
  ADMIN_EMAIL: 'owner@example.com',
  ADMIN_PASSWORD: 'secret',
  ADMIN_SESSION_KEY: 'owner-session-secret-with-enough-entropy',
} as never

describe('admin API boundary', () => {
  it('keeps health public and returns secure headers', async () => {
    const response = await app.request('https://example.com/health', {}, env)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      status: 'ok',
      service: 'instagram-material-delivery',
    })
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('rejects anonymous admin reads with a stable error code', async () => {
    const response = await app.request(
      'https://example.com/api/admin/dashboard',
      {},
      env,
    )
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Требуется авторизация.',
      },
    })
  })

  it('protects the delivery recovery command with the admin session', async () => {
    const response = await app.request(
      'https://example.com/api/admin/campaigns/campaign-1/deliveries/recover',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
          'Sec-Fetch-Site': 'same-origin',
        },
        body: JSON.stringify({
          commentId: '18083879864430633',
          text: 'Блог - тур',
        }),
      },
      env,
    )
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'AUTHENTICATION_REQUIRED' },
    })
  })

  it('rejects unsafe requests without an exact same-origin header', async () => {
    const response = await app.request(
      'https://example.com/api/admin/session',
      {
        method: 'POST',
        body: JSON.stringify({ password: 'secret' }),
        headers: { 'Content-Type': 'application/json' },
      },
      env,
    )
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'AUTHENTICATION_REQUIRED' },
    })
  })

  it('rejects same-site but not same-origin Fetch Metadata', async () => {
    const response = await app.request(
      'https://example.com/api/admin/session',
      {
        method: 'POST',
        body: JSON.stringify({ password: 'secret' }),
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
          'Sec-Fetch-Site': 'same-site',
        },
      },
      env,
    )
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'AUTHENTICATION_REQUIRED' },
    })
  })

  it('maps malformed JSON to validation instead of an internal error', async () => {
    const response = await app.request(
      'https://example.com/api/admin/session',
      {
        method: 'POST',
        body: '{',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
          'Sec-Fetch-Site': 'same-origin',
        },
      },
      env,
    )
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'VALIDATION_FAILED' },
    })
  })

  it('returns JSON not-found responses for unknown Worker-owned routes', async () => {
    for (const path of ['/api/does-not-exist', '/api/admin/does-not-exist']) {
      const response = await app.request(`https://example.com${path}`, {}, env)
      expect(response.status).toBe(404)
      await expect(response.json()).resolves.toMatchObject({
        error: { code: 'NOT_FOUND' },
      })
    }
  })
})
