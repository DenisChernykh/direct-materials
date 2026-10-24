import type { Env } from '../../../env'
import {
  exchangeAuthorizationCode,
  exchangeLongLivedToken,
  getOwnProfile,
  subscribeToWebhooks,
} from '../../../instagram/api'
import type { OAuthGateway } from '../application/oauth'

/** Adapts Meta's provider response to the small application-level port. */
export function createInstagramOAuthGateway(env: Env): OAuthGateway {
  return {
    async exchangeAuthorizationCode({ code, redirectUri }) {
      const result = await exchangeAuthorizationCode({
        appId: env.META_APP_ID,
        appSecret: env.META_APP_SECRET,
        redirectUri,
        code,
      })
      if (!result.ok) return { ok: false, code: result.code }
      return {
        ok: true,
        value: {
          accessToken: result.value.accessToken,
          permissions: result.value.permissions,
        },
      }
    },
    async exchangeLongLivedToken(shortLivedToken) {
      const result = await exchangeLongLivedToken(
        shortLivedToken,
        env.META_APP_SECRET,
      )
      return result.ok
        ? { ok: true, value: result.value }
        : { ok: false, code: result.code }
    },
    async getOwnProfile(accessToken) {
      const result = await getOwnProfile(accessToken)
      return result.ok
        ? { ok: true, value: result.value }
        : { ok: false, code: result.code }
    },
    async subscribeToWebhooks(accountId, accessToken) {
      const result = await subscribeToWebhooks(accountId, accessToken)
      return result.ok
        ? { ok: true, value: true }
        : { ok: false, code: result.code }
    },
  }
}
