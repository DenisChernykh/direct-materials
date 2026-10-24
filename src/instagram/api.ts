import { META_API_VERSION } from '../env'

export type InstagramApiFailure = {
  ok: false
  kind: 'retryable' | 'failed' | 'unknown'
  code: string
}

export type InstagramApiResult<T> = { ok: true; value: T } | InstagramApiFailure

export type InstagramMedia = {
  id: string
  caption?: string
  media_type?: string
  timestamp?: string
  permalink?: string
  thumbnail_url?: string
  media_url?: string
}

const graphBaseUrl = `https://graph.instagram.com/${META_API_VERSION}`
const requestTimeoutMs = 12_000

function failureForStatus(status: number, operation: 'read' | 'send'): InstagramApiFailure {
  if (status === 429) return { ok: false, kind: 'retryable', code: 'instagram_rate_limited' }
  if (status >= 500) {
    return {
      ok: false,
      kind: operation === 'send' ? 'unknown' : 'retryable',
      code: operation === 'send' ? 'instagram_send_outcome_unknown' : 'instagram_unavailable',
    }
  }
  return { ok: false, kind: 'failed', code: `instagram_http_${status}` }
}

async function requestJson<T>(
  url: string,
  init: RequestInit,
  operation: 'read' | 'send',
): Promise<InstagramApiResult<T>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    if (!response.ok) return failureForStatus(response.status, operation)
    return { ok: true, value: (await response.json()) as T }
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'AbortError'
    return {
      ok: false,
      kind: operation === 'send' ? 'unknown' : 'retryable',
      code: timedOut ? 'instagram_timeout' : 'instagram_network_error',
    }
  } finally {
    clearTimeout(timeout)
  }
}

function authorization(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

function buttonTemplate(text: string, button: { title: string; payload: string }) {
  return {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'button',
        text,
        buttons: [{ type: 'postback', title: button.title, payload: button.payload }],
      },
    },
  }
}

export async function sendPrivateReply(
  accountId: string,
  commentId: string,
  text: string,
  button: { title: string; payload: string },
  accessToken: string,
): Promise<InstagramApiResult<{ recipientId: string; messageId: string }>> {
  const result = await requestJson<{ recipient_id: string; message_id: string }>(
    `${graphBaseUrl}/${encodeURIComponent(accountId)}/messages`,
    {
      method: 'POST',
      headers: authorization(accessToken),
      body: JSON.stringify({
        recipient: { comment_id: commentId },
        message: buttonTemplate(text, button),
      }),
    },
    'send',
  )
  if (!result.ok) return result
  return {
    ok: true,
    value: { recipientId: result.value.recipient_id, messageId: result.value.message_id },
  }
}

export async function sendMessage(
  accountId: string,
  recipientId: string,
  text: string,
  accessToken: string,
  button?: { title: string; payload: string },
): Promise<InstagramApiResult<{ messageId: string }>> {
  const message = button ? buttonTemplate(text, button) : { text }
  const result = await requestJson<{ message_id: string }>(
    `${graphBaseUrl}/${encodeURIComponent(accountId)}/messages`,
    {
      method: 'POST',
      headers: authorization(accessToken),
      body: JSON.stringify({ recipient: { id: recipientId }, message }),
    },
    'send',
  )
  if (!result.ok) return result
  return { ok: true, value: { messageId: result.value.message_id } }
}

export async function sendCommentReply(
  commentId: string,
  text: string,
  accessToken: string,
): Promise<InstagramApiResult<{ commentId: string }>> {
  const result = await requestJson<{ id: string }>(
    `${graphBaseUrl}/${encodeURIComponent(commentId)}/replies`,
    {
      method: 'POST',
      headers: authorization(accessToken),
      body: JSON.stringify({ message: text }),
    },
    'send',
  )
  if (!result.ok) return result
  return { ok: true, value: { commentId: result.value.id } }
}

export async function getFollowerStatus(
  recipientId: string,
  accessToken: string,
): Promise<InstagramApiResult<boolean | null>> {
  const url = new URL(`${graphBaseUrl}/${encodeURIComponent(recipientId)}`)
  url.searchParams.set('fields', 'is_user_follow_business')
  const result = await requestJson<{ is_user_follow_business?: unknown }>(
    url.toString(),
    { headers: authorization(accessToken) },
    'read',
  )
  if (!result.ok) return result
  return {
    ok: true,
    value:
      typeof result.value.is_user_follow_business === 'boolean'
        ? result.value.is_user_follow_business
        : null,
  }
}

export async function listMedia(
  accessToken: string,
): Promise<InstagramApiResult<InstagramMedia[]>> {
  const url = new URL(`${graphBaseUrl}/me/media`)
  url.searchParams.set(
    'fields',
    'id,caption,media_type,timestamp,permalink,thumbnail_url,media_url',
  )
  url.searchParams.set('limit', '50')
  const result = await requestJson<{ data?: InstagramMedia[] }>(
    url.toString(),
    { headers: authorization(accessToken) },
    'read',
  )
  if (!result.ok) return result
  return { ok: true, value: Array.isArray(result.value.data) ? result.value.data : [] }
}

export async function exchangeAuthorizationCode(input: {
  appId: string
  appSecret: string
  redirectUri: string
  code: string
}): Promise<InstagramApiResult<{ accessToken: string; userId: string; permissions: string[] }>> {
  const body = new FormData()
  body.set('client_id', input.appId)
  body.set('client_secret', input.appSecret)
  body.set('grant_type', 'authorization_code')
  body.set('redirect_uri', input.redirectUri)
  body.set('code', input.code)
  const result = await requestJson<{
    access_token?: string
    user_id?: string | number
    permissions?: string | string[]
    data?: Array<{ access_token?: string; user_id?: string | number; permissions?: string | string[] }>
  }>('https://api.instagram.com/oauth/access_token', { method: 'POST', body }, 'read')
  if (!result.ok) return result

  const tokenData = result.value.data?.[0] ?? result.value
  if (!tokenData.access_token || tokenData.user_id === undefined) {
    return { ok: false, kind: 'failed', code: 'instagram_token_response_invalid' }
  }
  const permissions = Array.isArray(tokenData.permissions)
    ? tokenData.permissions
    : typeof tokenData.permissions === 'string'
      ? tokenData.permissions.split(',').map((permission) => permission.trim()).filter(Boolean)
      : []
  return {
    ok: true,
    value: {
      accessToken: tokenData.access_token,
      userId: String(tokenData.user_id),
      permissions,
    },
  }
}

export async function exchangeLongLivedToken(
  shortLivedToken: string,
  appSecret: string,
): Promise<InstagramApiResult<{ accessToken: string; expiresIn: number }>> {
  const url = new URL('https://graph.instagram.com/access_token')
  url.searchParams.set('grant_type', 'ig_exchange_token')
  url.searchParams.set('client_secret', appSecret)
  url.searchParams.set('access_token', shortLivedToken)
  const result = await requestJson<{ access_token?: string; expires_in?: number }>(
    url.toString(),
    {},
    'read',
  )
  if (!result.ok) return result
  if (!result.value.access_token || typeof result.value.expires_in !== 'number') {
    return { ok: false, kind: 'failed', code: 'instagram_long_token_response_invalid' }
  }
  return {
    ok: true,
    value: { accessToken: result.value.access_token, expiresIn: result.value.expires_in },
  }
}

export async function getOwnProfile(
  accessToken: string,
): Promise<InstagramApiResult<{ accountId: string; username: string }>> {
  const url = new URL(`${graphBaseUrl}/me`)
  url.searchParams.set('fields', 'user_id,username')
  const result = await requestJson<{ id?: string; user_id?: string | number; username?: string }>(
    url.toString(),
    { headers: authorization(accessToken) },
    'read',
  )
  if (!result.ok) return result
  const accountId = result.value.user_id ?? result.value.id
  if (accountId === undefined || !result.value.username) {
    return { ok: false, kind: 'failed', code: 'instagram_profile_response_invalid' }
  }
  return { ok: true, value: { accountId: String(accountId), username: result.value.username } }
}

export async function subscribeToWebhooks(
  accountId: string,
  accessToken: string,
): Promise<InstagramApiResult<true>> {
  const url = new URL(`${graphBaseUrl}/${encodeURIComponent(accountId)}/subscribed_apps`)
  url.searchParams.set(
    'subscribed_fields',
    'comments,messages,messaging_postbacks,messaging_optins,messaging_referral',
  )
  const result = await requestJson<{ success?: boolean }>(
    url.toString(),
    { method: 'POST', headers: authorization(accessToken), body: '{}' },
    'send',
  )
  if (!result.ok) return result
  if (result.value.success !== true) {
    return { ok: false, kind: 'failed', code: 'instagram_webhook_subscription_rejected' }
  }
  return { ok: true, value: true }
}
