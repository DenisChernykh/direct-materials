import { publicReplyForComment } from '../../../campaigns/public-reply'
import type { CampaignRepository } from '../../campaigns/application'
import type { DeliveryRepository, Delivery } from '../application'
import type { InstagramConnectionRepository } from '../../instagram-connection/application'

export type PublicReplyGateway = {
  sendCommentReply: (
    commentId: string,
    text: string,
    token: string,
  ) => Promise<
    | { ok: true; value?: unknown }
    | { ok: false; kind: 'retryable' | 'failed' | 'unknown'; code: string }
  >
}

export class PublicReplyUseCaseError extends Error {
  constructor(
    readonly code: 'NOT_FOUND' | 'CONFLICT' | 'DEPENDENCY_UNAVAILABLE',
    message: string,
  ) {
    super(message)
  }
}

export type PublicReplyUseCases = {
  run: (
    campaignId: string,
    expectedCount: number,
    retry: boolean,
  ) => Promise<{ sent: number; failed: number }>
}

export function createPublicReplyUseCases(deps: {
  campaigns: CampaignRepository
  deliveries: DeliveryRepository
  connection: InstagramConnectionRepository
  gateway: PublicReplyGateway
  encryptionKey: string
}): PublicReplyUseCases {
  return {
    async run(campaignId: string, expectedCount: number, retry: boolean) {
      if (!Number.isInteger(expectedCount) || expectedCount < 1)
        throw new PublicReplyUseCaseError(
          'CONFLICT',
          'Ожидаемое число ответов должно быть положительным.',
        )
      const campaign = await deps.campaigns.get(campaignId)
      if (!campaign)
        throw new PublicReplyUseCaseError('NOT_FOUND', 'Кампания не найдена.')
      if (
        !campaign.publicReplyEnabled ||
        campaign.publicReplyVariants.length === 0
      )
        throw new PublicReplyUseCaseError(
          'CONFLICT',
          'Сначала включите публичные ответы кампании.',
        )
      const candidates = retry
        ? await deps.deliveries.failed(campaign.id)
        : await deps.deliveries.backfillable(campaign.id)
      if (candidates.length === 0 || candidates.length !== expectedCount)
        throw new PublicReplyUseCaseError(
          'CONFLICT',
          'Список изменился. Обновите страницу и повторите действие.',
        )
      const token = await deps.connection.getConnectedToken(deps.encryptionKey)
      if (!token)
        throw new PublicReplyUseCaseError(
          'DEPENDENCY_UNAVAILABLE',
          'Instagram не подключён.',
        )
      let sent = 0
      let failed = 0
      for (const delivery of candidates) {
        const reply = retry
          ? retryText(campaign.publicReplyVariants, delivery)
          : publicReplyForComment(
              delivery.commentId,
              campaign.publicReplyVariants,
            )
        if (!reply) continue
        const claimed = retry
          ? await deps.deliveries.claimFailed(
              delivery.id,
              delivery.publicReplyText,
              reply,
            )
          : await deps.deliveries.claim(delivery.id, reply)
        if (!claimed) continue
        const result = await deps.gateway.sendCommentReply(
          delivery.commentId,
          reply,
          token.token,
        )
        await deps.deliveries.updatePublicReply(delivery.id, {
          status: result.ok
            ? 'sent'
            : result.kind === 'unknown'
              ? 'unknown'
              : 'failed',
          errorCode: result.ok ? null : result.code,
        })
        if (result.ok) sent += 1
        else failed += 1
      }
      return { sent, failed }
    },
  }
}

function retryText(variants: string[], delivery: Delivery): string | null {
  const previous = variants.indexOf(delivery.publicReplyText ?? '')
  return previous >= 0 && variants.length > 1
    ? (variants[(previous + 1) % variants.length] ?? null)
    : publicReplyForComment(`${delivery.commentId}:retry`, variants)
}
