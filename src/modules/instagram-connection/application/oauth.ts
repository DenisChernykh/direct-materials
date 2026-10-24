import type {
  InstagramConnectionInput,
  InstagramConnectionRepository,
} from '../application'

export type OAuthFailure = {
  ok: false
  code: string
}

export type OAuthGateway = {
  exchangeAuthorizationCode: (input: {
    code: string
    redirectUri: string
  }) => Promise<
    | {
        ok: true
        value: { accessToken: string; permissions: string[] }
      }
    | OAuthFailure
  >
  exchangeLongLivedToken: (
    shortLivedToken: string,
  ) => Promise<
    | { ok: true; value: { accessToken: string; expiresIn: number } }
    | OAuthFailure
  >
  getOwnProfile: (
    accessToken: string,
  ) => Promise<
    { ok: true; value: { accountId: string; username: string } } | OAuthFailure
  >
  subscribeToWebhooks: (
    accountId: string,
    accessToken: string,
  ) => Promise<{ ok: true; value: true } | OAuthFailure>
}

export type OAuthStatePort = {
  verify: (state: string) => Promise<boolean>
}

export type TokenCipherPort = {
  encrypt: (token: string) => Promise<{ ciphertext: string; iv: string }>
}

export type OAuthClock = {
  now: () => number
}

export type OAuthCompletion = {
  status: 302 | 400 | 502
  redirect?: string
  message: string
}

export type InstagramOAuthUseCase = {
  complete: (
    code: string | undefined,
    state: string | undefined,
  ) => Promise<OAuthCompletion>
}

const defaultPermissions = [
  'instagram_business_basic',
  'instagram_business_manage_comments',
  'instagram_business_manage_messages',
]

/**
 * Coordinates the provider workflow without knowing about Env, fetch, or D1.
 * Provider and persistence details are deliberately supplied as ports.
 */
export function createInstagramOAuthUseCase(deps: {
  gateway: OAuthGateway
  state: OAuthStatePort
  cipher: TokenCipherPort
  clock: OAuthClock
  repository: Pick<InstagramConnectionRepository, 'save'>
  redirectUri: string
  successRedirect: string
  permissions?: string[]
}): InstagramOAuthUseCase {
  const permissions = deps.permissions ?? defaultPermissions

  return {
    async complete(code, state) {
      if (!code || !state || !(await deps.state.verify(state)))
        return {
          status: 400,
          message: 'Instagram вернул некорректный OAuth-запрос.',
        }

      const shortToken = await deps.gateway.exchangeAuthorizationCode({
        code,
        redirectUri: deps.redirectUri,
      })
      if (!shortToken.ok)
        return {
          status: 502,
          message: 'Не удалось получить Instagram token.',
        }

      const longToken = await deps.gateway.exchangeLongLivedToken(
        shortToken.value.accessToken,
      )
      if (!longToken.ok)
        return {
          status: 502,
          message: 'Не удалось продлить Instagram token.',
        }

      const profile = await deps.gateway.getOwnProfile(
        longToken.value.accessToken,
      )
      if (!profile.ok)
        return {
          status: 502,
          message: 'Не удалось прочитать Instagram-профиль.',
        }

      const subscription = await deps.gateway.subscribeToWebhooks(
        profile.value.accountId,
        longToken.value.accessToken,
      )
      const encrypted = await deps.cipher.encrypt(longToken.value.accessToken)
      const input: InstagramConnectionInput = {
        accountId: profile.value.accountId,
        username: profile.value.username,
        tokenCiphertext: encrypted.ciphertext,
        tokenIv: encrypted.iv,
        tokenExpiresAt: new Date(
          deps.clock.now() + longToken.value.expiresIn * 1000,
        ).toISOString(),
        permissions:
          shortToken.value.permissions.length > 0
            ? shortToken.value.permissions
            : permissions,
        status: subscription.ok ? 'connected' : 'action_required',
        webhookSubscribed: subscription.ok,
      }
      await deps.repository.save(input)

      if (!subscription.ok)
        return {
          status: 502,
          message:
            'Instagram подключён, но webhook не активирован. Проверьте настройки приложения.',
        }
      return { status: 302, redirect: deps.successRedirect, message: '' }
    },
  }
}
