import {
  getFollowerStatus,
  listMedia,
  sendCommentReply,
  sendMessage,
  sendPrivateReply,
  type InstagramApiResult,
} from '../../../instagram/api'
import type {
  DeliveryEventGateway,
  Media,
  ProviderResult,
} from '../application/process-event'
import { toIsoTimestamp } from '../../../infrastructure/time'

function mapResult<T, U>(
  result: InstagramApiResult<T>,
  map: (value: T) => U,
): ProviderResult<U> {
  return result.ok ? { ok: true, value: map(result.value) } : result
}

export const instagramGateway: DeliveryEventGateway = {
  listMedia: async (token) =>
    mapResult(await listMedia(token), (items): Media[] =>
      items.map((item) => ({
        id: item.id,
        ...(item.timestamp
          ? { timestamp: toIsoTimestamp(item.timestamp) }
          : {}),
        permalink: item.permalink,
      })),
    ),
  sendPrivateReply: async (accountId, commentId, text, button, token) =>
    mapResult(
      await sendPrivateReply(accountId, commentId, text, button, token),
      (value) => ({ recipientId: value.recipientId }),
    ),
  sendCommentReply: (commentId, text, token) =>
    sendCommentReply(commentId, text, token),
  getFollowerStatus: (recipientId, token) =>
    getFollowerStatus(recipientId, token),
  sendMessage: (accountId, recipientId, text, token, button) =>
    sendMessage(accountId, recipientId, text, token, button),
}
