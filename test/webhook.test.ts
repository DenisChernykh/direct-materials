import { describe, expect, it } from 'vitest'
import { hmacHex } from '../src/security/crypto'
import { hasValidWebhookSignature, parseInstagramWebhook } from '../src/instagram/webhook'

describe('Instagram webhook', () => {
  it('accepts a valid signature and rejects a changed body', async () => {
    const body = '{"object":"instagram","entry":[]}'
    const signature = `sha256=${await hmacHex('app-secret', body)}`
    await expect(hasValidWebhookSignature(body, signature, 'app-secret')).resolves.toBe(true)
    await expect(hasValidWebhookSignature(`${body} `, signature, 'app-secret')).resolves.toBe(false)
  })

  it('parses comment, quick-reply and postback events without retaining unrelated fields', () => {
    const events = parseInstagramWebhook({
      object: 'instagram',
      entry: [
        {
          id: 'business-account',
          changes: [
            {
              field: 'comments',
              value: {
                id: 'comment-1',
                text: 'Хочу курс',
                media: { id: 'media-1' },
                from: { username: 'not-retained' },
              },
            },
          ],
          messaging: [
            {
              sender: { id: 'recipient-1' },
              message: {
                mid: 'message-1',
                text: 'Получить',
                quick_reply: { payload: 'material-delivery:delivery-1:get' },
              },
            },
            {
              sender: { id: 'recipient-2' },
              postback: {
                mid: 'message-2',
                title: 'Проверить подписку',
                payload: 'material-delivery:delivery-2:recheck',
              },
            },
          ],
        },
      ],
    })
    expect(events).toEqual([
      {
        kind: 'comment',
        accountId: 'business-account',
        commentId: 'comment-1',
        mediaId: 'media-1',
        text: 'Хочу курс',
      },
      {
        kind: 'action',
        accountId: 'business-account',
        recipientId: 'recipient-1',
        eventId: 'message-1',
        payload: 'material-delivery:delivery-1:get',
      },
      {
        kind: 'action',
        accountId: 'business-account',
        recipientId: 'recipient-2',
        eventId: 'message-2',
        payload: 'material-delivery:delivery-2:recheck',
      },
    ])
  })
})
