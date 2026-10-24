import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendCommentReply, sendMessage, sendPrivateReply } from '../src/instagram/api'

afterEach(() => {
  vi.unstubAllGlobals()
})

function successfulFetch(response: Record<string, string>) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function requestBody(fetchMock: ReturnType<typeof vi.fn>): unknown {
  const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
  return JSON.parse(String(init?.body))
}

describe('Instagram message payloads', () => {
  it('publishes a configured reply under the triggering comment', async () => {
    const fetchMock = successfulFetch({ id: 'reply-comment-1' })

    await expect(
      sendCommentReply('comment-1', 'Отправила в Direct 💌', 'token'),
    ).resolves.toEqual({ ok: true, value: { commentId: 'reply-comment-1' } })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/comment-1/replies'),
      expect.objectContaining({ method: 'POST' }),
    )
    expect(requestBody(fetchMock)).toEqual({ message: 'Отправила в Direct 💌' })
  })

  it('sends the opening private reply as an attached postback button', async () => {
    const fetchMock = successfulFetch({ recipient_id: 'recipient-1', message_id: 'message-1' })

    await expect(
      sendPrivateReply(
        'account-1',
        'comment-1',
        'Материал готов.',
        { title: 'Получить', payload: 'material-delivery:delivery-1:get' },
        'token',
      ),
    ).resolves.toEqual({
      ok: true,
      value: { recipientId: 'recipient-1', messageId: 'message-1' },
    })
    expect(requestBody(fetchMock)).toEqual({
      recipient: { comment_id: 'comment-1' },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: 'Материал готов.',
            buttons: [
              {
                type: 'postback',
                title: 'Получить',
                payload: 'material-delivery:delivery-1:get',
              },
            ],
          },
        },
      },
    })
  })

  it('sends the follow check as an attached postback button', async () => {
    const fetchMock = successfulFetch({ message_id: 'message-2' })

    await expect(
      sendMessage(
        'account-1',
        'recipient-1',
        'Сначала подпишитесь.',
        'token',
        { title: 'Проверить подписку', payload: 'material-delivery:delivery-1:recheck' },
      ),
    ).resolves.toEqual({ ok: true, value: { messageId: 'message-2' } })
    expect(requestBody(fetchMock)).toEqual({
      recipient: { id: 'recipient-1' },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: 'Сначала подпишитесь.',
            buttons: [
              {
                type: 'postback',
                title: 'Проверить подписку',
                payload: 'material-delivery:delivery-1:recheck',
              },
            ],
          },
        },
      },
    })
  })
})
