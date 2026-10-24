export type InstagramCommentEvent = {
  kind: 'comment'
  accountId: string
  commentId: string
  mediaId: string
  text: string
}

export type InstagramActionEvent = {
  kind: 'action'
  accountId: string
  recipientId: string
  eventId: string
  payload: string
}

export type InstagramEvent = InstagramCommentEvent | InstagramActionEvent

export interface Env {
  DB: D1Database
  INSTAGRAM_EVENTS: Queue<InstagramEvent>
  ASSETS?: Fetcher
  META_APP_ID: string
  META_APP_SECRET: string
  META_WEBHOOK_VERIFY_TOKEN: string
  TOKEN_ENCRYPTION_KEY: string
  OAUTH_STATE_KEY: string
  ADMIN_EMAIL: string
  ADMIN_PASSWORD: string
  ADMIN_SESSION_KEY: string
  PUBLIC_BASE_URL: string
  LOCAL_DEVELOPMENT?: string
}

export const META_API_VERSION = 'v25.0'

export function requireEnv(env: Env, names: Array<keyof Env>): void {
  const missing = names.filter((name) => !env[name])
  if (missing.length > 0) {
    throw new Error(`Missing required bindings: ${missing.join(', ')}`)
  }
}
