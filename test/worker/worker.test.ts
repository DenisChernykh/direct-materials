import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createScheduledController,
  createExecutionContext,
  createMessageBatch,
  env,
  getQueueResult,
  SELF,
} from 'cloudflare:test'
import type { Env, InstagramEvent } from '../../src/env'
import app from '../../src/api'
import worker from '../../src/index'
import {
  createSignedState,
  decryptToken,
  encryptToken,
} from '../../src/security/crypto'
import migrationOne from '../../migrations/0001_initial_schema.sql?raw'
import migrationTwo from '../../migrations/0002_campaign_trigger_modes.sql?raw'
import migrationThree from '../../migrations/0003_public_comment_replies.sql?raw'
import migrationFour from '../../migrations/0004_delivery_public_reply_lookup.sql?raw'

const bindings = env as unknown as Env
// Secrets are intentionally absent from wrangler.jsonc. Supply non-production
// test values while retaining the real workerd D1/Queue bindings.
const routeBindings = {
  ...bindings,
  ADMIN_EMAIL: 'owner@example.com',
  ADMIN_PASSWORD: 'test-password',
  ADMIN_SESSION_KEY: 'test-session-key',
} as Env
const accessHeaders = {
  'Cf-Access-Authenticated-User-Email': 'owner@example.com',
  Origin: 'https://example.com',
  'Sec-Fetch-Site': 'same-origin',
}

function statements(sql: string) {
  return sql
    .replace(/^PRAGMA[^;]+;\s*/u, '')
    .split(/;\s*(?=(?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE)\b)/u)
    .map((statement) => statement.trim())
    .filter(Boolean)
}

async function apiRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  Object.entries(accessHeaders).forEach(([name, value]) =>
    headers.set(name, value),
  )
  if (init.body) headers.set('Content-Type', 'application/json')
  return app.request(
    `https://example.com${path}`,
    { ...init, headers },
    routeBindings,
  )
}

function campaignBody(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Guide campaign',
    mediaId: 'media-1',
    mediaPermalink: null,
    triggerMode: 'specific',
    matchMode: 'contains',
    keywords: ['guide'],
    initialMessage: 'Here is the material.',
    initialButtonText: 'Get it',
    followMessage: 'Please follow first.',
    recheckButtonText: 'Check again',
    deliveryMessage: 'Your material:',
    unavailableMessage: 'Try again later.',
    materialUrl: 'https://example.com/material',
    publicReplyEnabled: false,
    publicReplyVariants: [],
    ...overrides,
  }
}

async function createCampaign(overrides: Record<string, unknown> = {}) {
  const response = await apiRequest('/api/admin/campaigns', {
    method: 'POST',
    body: JSON.stringify(campaignBody(overrides)),
  })
  expect(response.status).toBe(201)
  return (await response.json()) as {
    campaign: {
      id: string
      status: string
      revision: number
      createdAt: string
      updatedAt: string
    }
  }
}

async function seedConnection() {
  await bindings.DB.prepare(
    `INSERT INTO instagram_connection (
      singleton_id, account_id, username, token_ciphertext, token_iv,
      token_expires_at, permissions_json, status, webhook_subscribed
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      'account-1',
      'owner',
      'ciphertext',
      'iv',
      '2099-01-01T00:00:00.000Z',
      '[]',
      'connected',
      1,
    )
    .run()
}

async function seedDelivery(
  campaignId: string,
  input: { id: string; commentId: string; createdAt: string; status?: string },
) {
  await bindings.DB.prepare(
    `INSERT INTO deliveries (
      id, campaign_id, campaign_revision, comment_id, recipient_id,
      last_action_event_id, status, initial_message, initial_button_text,
      follow_message, recheck_button_text, delivery_message,
      unavailable_message, material_url, error_code, created_at, updated_at,
      delivered_at, public_reply_text, public_reply_status, public_reply_error_code
    ) VALUES (?, ?, 1, ?, NULL, NULL, ?, 'Initial', 'Get', 'Follow',
      'Check', 'Delivery', 'Unavailable', 'https://example.com/material',
      NULL, ?, ?, NULL, NULL, 'disabled', NULL)`,
  )
    .bind(
      input.id,
      campaignId,
      input.commentId,
      input.status ?? 'received',
      input.createdAt,
      input.createdAt,
    )
    .run()
}

beforeAll(async () => {
  for (const migration of [
    migrationOne,
    migrationTwo,
    migrationThree,
    migrationFour,
  ]) {
    for (const query of statements(migration))
      await bindings.DB.prepare(query).run()
  }
})

beforeEach(async () => {
  await bindings.DB.batch([
    bindings.DB.prepare('DELETE FROM deliveries'),
    bindings.DB.prepare('DELETE FROM campaign_keywords'),
    bindings.DB.prepare('DELETE FROM campaigns'),
    bindings.DB.prepare('DELETE FROM instagram_connection'),
  ])
})

describe('Worker integration', () => {
  it('runs the Worker entrypoint in workerd', async () => {
    const response = await SELF.fetch('https://example.com/health')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      status: 'ok',
      service: 'instagram-material-delivery',
    })
  })

  it('keeps unknown Worker-owned paths as JSON errors and serves SPA paths via assets', async () => {
    for (const path of [
      '/api/does-not-exist',
      '/oauth/does-not-exist',
      '/webhooks/does-not-exist',
      '/health/does-not-exist',
    ]) {
      const response = await SELF.fetch(`https://example.com${path}`)
      expect(response.status).toBe(404)
      expect(response.headers.get('content-type')).toContain('application/json')
      expect(await response.json()).toMatchObject({
        error: { code: 'NOT_FOUND' },
      })
    }
    const spa = await app.request(
      'https://example.com/admin/unknown',
      {},
      {
        ...routeBindings,
        ASSETS: {
          fetch: async () =>
            new Response('<!doctype html><title>Direct Materials</title>', {
              headers: { 'Content-Type': 'text/html; charset=UTF-8' },
            }),
        },
      },
    )
    expect(spa.status).toBe(200)
    expect(spa.headers.get('content-type')).toContain('text/html')
  })

  it('applies the delivery public reply index to isolated D1', async () => {
    const result = await bindings.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'deliveries_campaign_public_reply_created_idx'",
    ).first<{ name: string }>()
    expect(result?.name).toBe('deliveries_campaign_public_reply_created_idx')
  })

  it('creates drafts, atomically replaces keywords, and rejects lifecycle fields', async () => {
    const created = await createCampaign()
    expect(created.campaign.status).toBe('draft')
    expect(created.campaign.createdAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u,
    )
    expect(created.campaign.updatedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u,
    )
    const id = created.campaign.id
    const update = await apiRequest(`/api/admin/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(
        campaignBody({
          name: 'Updated campaign',
          keywords: ['new phrase', 'second'],
        }),
      ),
    })
    expect(update.status).toBe(200)
    const keywords = await bindings.DB.prepare(
      'SELECT value FROM campaign_keywords WHERE campaign_id = ? ORDER BY value',
    )
      .bind(id)
      .all<{ value: string }>()
    expect(keywords.results.map((row) => row.value)).toEqual([
      'new phrase',
      'second',
    ])
    const updated = (await update.json()) as {
      campaign: { status: string }
    }
    expect(updated.campaign.status).toBe('draft')

    const invalid = await apiRequest(`/api/admin/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(campaignBody({ status: 'active' })),
    })
    expect(invalid.status).toBe(400)
    expect(await invalid.json()).toMatchObject({
      error: { code: 'VALIDATION_FAILED' },
    })
  })

  it('enforces connection and active-trigger conflicts through the API', async () => {
    await seedConnection()
    const first = await createCampaign({
      name: 'Any one',
      triggerMode: 'any',
      mediaId: '',
    })
    const second = await createCampaign({
      name: 'Any two',
      triggerMode: 'any',
      mediaId: '',
    })
    const activateFirst = await apiRequest(
      `/api/admin/campaigns/${first.campaign.id}/status`,
      { method: 'PUT', body: JSON.stringify({ status: 'active' }) },
    )
    expect(activateFirst.status).toBe(200)
    const activateSecond = await apiRequest(
      `/api/admin/campaigns/${second.campaign.id}/status`,
      { method: 'PUT', body: JSON.stringify({ status: 'active' }) },
    )
    expect(activateSecond.status).toBe(409)
    expect(await activateSecond.json()).toMatchObject({
      error: { code: 'CONFLICT' },
    })
  })

  it('protects admin routes and unsafe requests at the Worker boundary', async () => {
    const anonymous = await SELF.fetch(
      'https://example.com/api/admin/dashboard',
    )
    expect(anonymous.status).toBe(401)
    expect(await anonymous.json()).toMatchObject({
      error: { code: 'AUTHENTICATION_REQUIRED' },
    })
    const crossOrigin = await SELF.fetch(
      'https://example.com/api/admin/session',
      {
        method: 'POST',
        body: JSON.stringify({ password: 'secret' }),
        headers: {
          'Content-Type': 'application/json',
          ...accessHeaders,
          Origin: 'https://attacker.example',
        },
      },
    )
    expect(crossOrigin.status).toBe(401)
    expect(await crossOrigin.json()).toMatchObject({
      error: { code: 'AUTHENTICATION_REQUIRED' },
    })
    const malformed = await apiRequest('/api/admin/session', {
      method: 'POST',
      body: '{',
    })
    expect(malformed.status).toBe(400)
    expect(await malformed.json()).toMatchObject({
      error: { code: 'VALIDATION_FAILED' },
    })
  })

  it('maps persisted OAuth connection data to safe camelCase API data', async () => {
    await seedConnection()
    const response = await apiRequest('/api/admin/dashboard')
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      connection: Record<string, unknown>
    }
    expect(body.connection).toMatchObject({
      accountId: 'account-1',
      username: 'owner',
      webhookSubscribed: true,
      status: 'connected',
    })
    expect(body.connection.createdAt).toMatch(/Z$/u)
    expect(body.connection.updatedAt).toMatch(/Z$/u)
    expect(body.connection).not.toHaveProperty('tokenCiphertext')
    expect(body.connection).not.toHaveProperty('webhook_subscribed')
  })

  it('persists the OAuth callback through the application ports', async () => {
    const encryptionKey = 'A'.repeat(43)
    const oauthBindings = {
      ...routeBindings,
      META_APP_ID: 'meta-app-id',
      META_APP_SECRET: 'meta-app-secret',
      META_WEBHOOK_VERIFY_TOKEN: 'verify-token',
      TOKEN_ENCRYPTION_KEY: encryptionKey,
      OAUTH_STATE_KEY: 'oauth-state-key',
      PUBLIC_BASE_URL: 'https://example.com',
    } as Env
    const state = await createSignedState(oauthBindings.OAUTH_STATE_KEY)
    const providerFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/oauth/access_token'))
        return new Response(
          JSON.stringify({
            access_token: 'short-token',
            user_id: 'account-oauth',
            permissions: ['comments'],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      if (url.includes('/access_token?grant_type=ig_exchange_token'))
        return new Response(
          JSON.stringify({ access_token: 'long-token', expires_in: 3600 }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      if (url.includes('/me?fields=user_id%2Cusername'))
        return new Response(
          JSON.stringify({ user_id: 'account-oauth', username: 'oauth-owner' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      if (url.includes('/subscribed_apps?'))
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      throw new Error(`Unexpected provider URL: ${url}`)
    })
    const originalFetch = globalThis.fetch
    vi.stubGlobal('fetch', providerFetch)
    try {
      const response = await app.request(
        `https://example.com/oauth/instagram/callback?code=auth-code&state=${encodeURIComponent(state)}`,
        {},
        oauthBindings,
      )
      expect(response.status).toBe(302)
      expect(response.headers.get('Location')).toBe('/admin?connected=1')
    } finally {
      vi.stubGlobal('fetch', originalFetch)
    }
    expect(providerFetch).toHaveBeenCalledTimes(4)
    const row = await bindings.DB.prepare(
      'SELECT account_id, username, token_ciphertext, token_iv, status, webhook_subscribed FROM instagram_connection WHERE singleton_id = 1',
    ).first<{
      account_id: string
      username: string
      token_ciphertext: string
      token_iv: string
      status: string
      webhook_subscribed: number
    }>()
    expect(row).toMatchObject({
      account_id: 'account-oauth',
      username: 'oauth-owner',
      status: 'connected',
      webhook_subscribed: 1,
    })
    expect(
      await decryptToken(row!.token_ciphertext, row!.token_iv, encryptionKey),
    ).toBe('long-token')
  })

  it('guards public-reply backfill when the expected candidate count changed', async () => {
    const campaign = await createCampaign({
      publicReplyEnabled: true,
      publicReplyVariants: ['Thanks!'],
    })
    await seedDelivery(campaign.campaign.id, {
      id: 'delivery-1',
      commentId: 'comment-1',
      createdAt: '2026-08-26T10:00:00.000Z',
      status: 'initial_dm_sent',
    })
    const response = await apiRequest(
      `/api/admin/campaigns/${campaign.campaign.id}/public-replies/backfill`,
      { method: 'POST', body: JSON.stringify({ expectedCount: 0 }) },
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: { code: 'VALIDATION_FAILED' },
    })
  })

  it('rejects an empty public-reply candidate set before token/provider access', async () => {
    const campaign = await createCampaign({
      publicReplyEnabled: true,
      publicReplyVariants: ['Thanks!'],
    })
    const response = await apiRequest(
      `/api/admin/campaigns/${campaign.campaign.id}/public-replies/backfill`,
      { method: 'POST', body: JSON.stringify({ expectedCount: 1 }) },
    )
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: { code: 'CONFLICT' },
    })
  })

  it('cleans only deliveries older than 30 days and preserves campaigns/newer rows', async () => {
    const oldCampaign = await createCampaign({ name: 'Old campaign' })
    const newerCampaign = await createCampaign({
      name: 'Newer campaign',
      mediaId: 'media-2',
    })
    const now = Date.now()
    await seedDelivery(oldCampaign.campaign.id, {
      id: 'old-delivery',
      commentId: 'old-comment',
      createdAt: new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString(),
    })
    await seedDelivery(newerCampaign.campaign.id, {
      id: 'new-delivery',
      commentId: 'new-comment',
      createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
    })
    await worker.scheduled(
      createScheduledController({ cron: '17 3 * * *' }),
      bindings,
    )
    const deliveries = await bindings.DB.prepare(
      'SELECT id FROM deliveries ORDER BY id',
    ).all<{ id: string }>()
    expect(deliveries.results.map((row) => row.id)).toEqual(['new-delivery'])
    const campaigns = await bindings.DB.prepare(
      'SELECT id FROM campaigns ORDER BY id',
    ).all<{ id: string }>()
    expect(campaigns.results).toHaveLength(2)
  })

  it('returns delivery history timestamps as ISO strings', async () => {
    const campaign = await createCampaign()
    await seedDelivery(campaign.campaign.id, {
      id: 'history-delivery',
      commentId: 'history-comment',
      createdAt: '2026-08-26T10:00:00.000Z',
      status: 'delivered',
    })
    const response = await apiRequest('/api/admin/history')
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      deliveries: Array<{ createdAt: string; updatedAt: string }>
    }
    expect(body.deliveries[0]?.createdAt).toBe('2026-08-26T10:00:00.000Z')
    expect(body.deliveries[0]?.updatedAt).toBe('2026-08-26T10:00:00.000Z')
  })

  it('acknowledges a queue event in workerd after the application handles it', async () => {
    const encryptionKey = 'A'.repeat(43)
    const encrypted = await encryptToken('test-token', encryptionKey)
    await seedConnection()
    await bindings.DB.prepare(
      'UPDATE instagram_connection SET token_ciphertext = ?, token_iv = ? WHERE singleton_id = 1',
    )
      .bind(encrypted.ciphertext, encrypted.iv)
      .run()
    const campaign = await createCampaign({ keywords: ['different'] })
    const activated = await apiRequest(
      `/api/admin/campaigns/${campaign.campaign.id}/status`,
      { method: 'PUT', body: JSON.stringify({ status: 'active' }) },
    )
    expect(activated.status).toBe(200)
    const event: InstagramEvent = {
      kind: 'comment',
      accountId: 'account-1',
      commentId: 'comment-1',
      mediaId: 'media-1',
      text: 'guide',
    }
    const batch = createMessageBatch<InstagramEvent>(
      'tanyastrelchuk-instagram-events',
      [
        {
          id: 'message-1',
          timestamp: new Date(),
          attempts: 1,
          body: event,
        },
      ],
    )
    const context = createExecutionContext()
    await worker.queue(batch, {
      ...bindings,
      TOKEN_ENCRYPTION_KEY: encryptionKey,
    } as Env)
    const result = await getQueueResult(batch, context)
    expect(result).toMatchObject({ outcome: 'ok' })
    const deliveries = await bindings.DB.prepare(
      'SELECT COUNT(*) AS count FROM deliveries',
    ).first<{ count: number }>()
    expect(deliveries?.count).toBe(0)
  })

  it('transitions a matching queue delivery through the injected gateway', async () => {
    const encryptionKey = 'A'.repeat(43)
    const encrypted = await encryptToken('test-token', encryptionKey)
    await seedConnection()
    await bindings.DB.prepare(
      'UPDATE instagram_connection SET token_ciphertext = ?, token_iv = ? WHERE singleton_id = 1',
    )
      .bind(encrypted.ciphertext, encrypted.iv)
      .run()
    const campaign = await createCampaign({ keywords: ['guide'] })
    const activated = await apiRequest(
      `/api/admin/campaigns/${campaign.campaign.id}/status`,
      { method: 'PUT', body: JSON.stringify({ status: 'active' }) },
    )
    expect(activated.status).toBe(200)
    const gateway = {
      listMedia: vi.fn().mockResolvedValue({ ok: true, value: [] }),
      sendPrivateReply: vi.fn().mockResolvedValue({
        ok: true,
        value: { recipientId: 'recipient-1' },
      }),
      sendCommentReply: vi.fn().mockResolvedValue({ ok: true, value: {} }),
      getFollowerStatus: vi.fn().mockResolvedValue({ ok: true, value: true }),
      sendMessage: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    }
    const testWorker = (await import('../../src/index')).createWorker({
      gateway,
    })
    const event: InstagramEvent = {
      kind: 'comment',
      accountId: 'account-1',
      commentId: 'matching-comment',
      mediaId: 'media-1',
      text: 'guide',
    }
    const batch = createMessageBatch<InstagramEvent>(
      'tanyastrelchuk-instagram-events',
      [
        {
          id: 'matching-message',
          timestamp: new Date(),
          attempts: 1,
          body: event,
        },
      ],
    )
    const context = createExecutionContext()
    await testWorker.queue(batch, {
      ...bindings,
      TOKEN_ENCRYPTION_KEY: encryptionKey,
    } as Env)
    expect(await getQueueResult(batch, context)).toMatchObject({
      outcome: 'ok',
    })
    expect(gateway.sendPrivateReply).toHaveBeenCalledWith(
      'account-1',
      'matching-comment',
      'Here is the material.',
      expect.objectContaining({ title: 'Get it' }),
      'test-token',
    )
    const delivery = await bindings.DB.prepare(
      'SELECT status, recipient_id FROM deliveries WHERE comment_id = ?',
    )
      .bind('matching-comment')
      .first<{ status: string; recipient_id: string }>()
    expect(delivery).toEqual({
      status: 'initial_dm_sent',
      recipient_id: 'recipient-1',
    })
  })
})
