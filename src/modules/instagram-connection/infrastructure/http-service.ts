import type { Env } from '../../../env'
import { requireEnv } from '../../../env'
import {
  hasValidWebhookSignature,
  parseInstagramWebhook,
} from '../../../instagram/webhook'
import {
  createSignedState,
  encryptToken,
  verifySignedState,
} from '../../../security/crypto'
import type {
  InstagramConnectionHttpService,
  InstagramEvent,
} from '../application'
import { createInstagramOAuthUseCase } from '../application/oauth'
import { createInstagramOAuthGateway } from './oauth-gateway'
import { createInstagramConnectionRepository } from './repository'
import { listAvailableMedia } from './media-repository'

const maxWebhookBytes = 1_000_000
const instagramPermissions = [
  'instagram_business_basic',
  'instagram_business_manage_comments',
  'instagram_business_manage_messages',
]

export function createInstagramConnectionHttpService(
  env: Env,
): InstagramConnectionHttpService {
  const repository = createInstagramConnectionRepository(env.DB, () =>
    listAvailableMedia(env),
  )
  const oauth = createInstagramOAuthUseCase({
    gateway: createInstagramOAuthGateway(env),
    state: { verify: (state) => verifySignedState(env.OAUTH_STATE_KEY, state) },
    cipher: {
      encrypt: (token) => encryptToken(token, env.TOKEN_ENCRYPTION_KEY),
    },
    clock: { now: () => Date.now() },
    repository,
    redirectUri: `${env.PUBLIC_BASE_URL}/oauth/instagram/callback`,
    successRedirect: '/admin?connected=1',
    permissions: instagramPermissions,
  })

  return {
    verifyWebhook({ mode, token, challenge }) {
      if (
        mode === 'subscribe' &&
        token === env.META_WEBHOOK_VERIFY_TOKEN &&
        challenge
      )
        return challenge
      return null
    },
    async receiveWebhook(rawBody, signature) {
      requireEnv(env, ['META_APP_SECRET'])
      if (new TextEncoder().encode(rawBody).byteLength > maxWebhookBytes)
        return { status: 413, message: 'Payload too large.' }
      if (
        !(await hasValidWebhookSignature(
          rawBody,
          signature,
          env.META_APP_SECRET,
        ))
      )
        return { status: 401, message: 'Invalid signature.' }
      let payload: unknown
      try {
        payload = JSON.parse(rawBody)
      } catch {
        return { status: 400, message: 'Invalid JSON.' }
      }
      const events = parseInstagramWebhook(
        payload,
      ) as unknown as InstagramEvent[]
      if (events.length > 0)
        await env.INSTAGRAM_EVENTS.sendBatch(
          events.map((event) => ({ body: event })),
        )
      return { status: 200, accepted: events.length }
    },
    async startOAuth() {
      requireEnv(env, ['META_APP_ID', 'OAUTH_STATE_KEY', 'PUBLIC_BASE_URL'])
      const state = await createSignedState(env.OAUTH_STATE_KEY)
      const authorizationUrl = new URL(
        'https://www.instagram.com/oauth/authorize',
      )
      authorizationUrl.searchParams.set('client_id', env.META_APP_ID)
      authorizationUrl.searchParams.set(
        'redirect_uri',
        `${env.PUBLIC_BASE_URL}/oauth/instagram/callback`,
      )
      authorizationUrl.searchParams.set('response_type', 'code')
      authorizationUrl.searchParams.set('scope', instagramPermissions.join(','))
      authorizationUrl.searchParams.set('state', state)
      return authorizationUrl.toString()
    },
    async completeOAuth(code, state) {
      requireEnv(env, [
        'META_APP_ID',
        'META_APP_SECRET',
        'OAUTH_STATE_KEY',
        'TOKEN_ENCRYPTION_KEY',
        'PUBLIC_BASE_URL',
      ])
      return oauth.complete(code, state)
    },
  }
}
