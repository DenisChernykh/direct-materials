import { Hono } from 'hono'
import type { AppContext } from '../../../shared/app-context'
import { ApiError } from '../../../shared/api-error'

export function createInstagramConnectionRoutes() {
  return new Hono<AppContext>()
    .get('/webhooks/instagram', (c) => {
      const challenge = c.get('services').instagram.verifyWebhook({
        mode: c.req.query('hub.mode'),
        token: c.req.query('hub.verify_token'),
        challenge: c.req.query('hub.challenge'),
      })
      return challenge
        ? c.text(challenge)
        : c.text('Webhook verification rejected.', 403)
    })
    .post('/webhooks/instagram', async (c) => {
      const declaredLength = Number(c.req.header('Content-Length') ?? 0)
      if (declaredLength > 1_000_000) return c.text('Payload too large.', 413)
      const result = await c
        .get('services')
        .instagram.receiveWebhook(
          await c.req.raw.text(),
          c.req.header('X-Hub-Signature-256'),
        )
      if (result.status !== 200)
        return c.text(
          result.message ?? 'Webhook rejected.',
          result.status as 400 | 401 | 413,
        )
      return c.json({ accepted: result.accepted ?? 0 })
    })
    .get('/oauth/instagram/start', async (c) => {
      const session = await c
        .get('services')
        .adminAuth.getSession(c.req.raw.headers)
      if (!session.authenticated)
        return c.redirect(
          `/login?next=${encodeURIComponent('/oauth/instagram/start')}`,
          302,
        )
      return c.redirect(await c.get('services').instagram.startOAuth(), 302)
    })
    .get('/oauth/instagram/callback', async (c) => {
      const result = await c
        .get('services')
        .instagram.completeOAuth(c.req.query('code'), c.req.query('state'))
      if (result.redirect) return c.redirect(result.redirect, 302)
      throw new ApiError(
        result.status === 400 ? 'VALIDATION_FAILED' : 'DEPENDENCY_UNAVAILABLE',
        result.message,
        result.status as 400 | 502,
      )
    })
}
