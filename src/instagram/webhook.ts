import type { InstagramEvent } from '../env'
import { constantTimeEqual, hmacHex } from '../security/crypto'

type UnknownRecord = Record<string, unknown>

function record(value: unknown): UnknownRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined
}

function string(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export async function hasValidWebhookSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  appSecret: string,
): Promise<boolean> {
  if (!signatureHeader?.startsWith('sha256=')) return false
  const expected = await hmacHex(appSecret, rawBody)
  return constantTimeEqual(signatureHeader.slice('sha256='.length), expected)
}

export function parseInstagramWebhook(payload: unknown): InstagramEvent[] {
  const root = record(payload)
  if (root?.object !== 'instagram' || !Array.isArray(root.entry)) return []

  const events: InstagramEvent[] = []
  for (const rawEntry of root.entry) {
    const entry = record(rawEntry)
    if (!entry) continue
    const accountId = string(entry?.id)
    if (!accountId) continue

    if (Array.isArray(entry.changes)) {
      for (const rawChange of entry.changes) {
        const change = record(rawChange)
        const value = record(change?.value)
        const media = record(value?.media)
        const commentId = string(value?.id)
        const mediaId = string(media?.id)
        const text = string(value?.text)
        if (change?.field === 'comments' && commentId && mediaId && text) {
          events.push({ kind: 'comment', accountId, commentId, mediaId, text })
        }
      }
    }

    if (Array.isArray(entry.messaging)) {
      for (const rawMessaging of entry.messaging) {
        const messaging = record(rawMessaging)
        const sender = record(messaging?.sender)
        const message = record(messaging?.message)
        const quickReply = record(message?.quick_reply)
        const postback = record(messaging?.postback)
        const recipientId = string(sender?.id)
        const payloadValue = string(quickReply?.payload) ?? string(postback?.payload)
        const eventId = string(message?.mid) ?? string(postback?.mid)
        if (recipientId && payloadValue && eventId && messaging?.is_self !== true) {
          events.push({ kind: 'action', accountId, recipientId, payload: payloadValue, eventId })
        }
      }
    }
  }

  return events
}
