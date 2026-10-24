import { matchesAnyKeyword } from '../../../campaigns/matching'
import type { CampaignRepository } from '../../campaigns/application'
import type { InstagramConnectionRepository } from '../../instagram-connection/application'
import type { DeliveryRepository } from '../application'
import type { InstagramCommentEvent } from './process-event'

export class RecoverDeliveryUseCaseError extends Error {
  constructor(
    readonly code:
      'NOT_FOUND' | 'CONFLICT' | 'VALIDATION_FAILED' | 'DEPENDENCY_UNAVAILABLE',
    message: string,
  ) {
    super(message)
    this.name = 'RecoverDeliveryUseCaseError'
  }
}

export function createRecoverDeliveryUseCase(deps: {
  campaigns: CampaignRepository
  deliveries: DeliveryRepository
  connection: InstagramConnectionRepository
  enqueue: (event: InstagramCommentEvent) => Promise<void>
}) {
  return async (campaignId: string, commentId: string, text: string) => {
    const campaign = await deps.campaigns.get(campaignId)
    if (!campaign)
      throw new RecoverDeliveryUseCaseError('NOT_FOUND', 'Кампания не найдена.')
    if (
      campaign.status !== 'active' ||
      campaign.triggerMode !== 'specific' ||
      !campaign.mediaId
    )
      throw new RecoverDeliveryUseCaseError(
        'CONFLICT',
        'Восстановление доступно только для активной кампании с выбранной публикацией.',
      )
    if (!matchesAnyKeyword(text, campaign.keywords, campaign.matchMode))
      throw new RecoverDeliveryUseCaseError(
        'VALIDATION_FAILED',
        'Текст комментария не совпадает с ключевыми словами кампании.',
      )
    if (await deps.deliveries.findByComment(campaign.id, commentId))
      throw new RecoverDeliveryUseCaseError(
        'CONFLICT',
        'Доставка для этого комментария уже существует.',
      )
    const connection = await deps.connection.get()
    if (
      !connection ||
      connection.status !== 'connected' ||
      !connection.webhookSubscribed
    )
      throw new RecoverDeliveryUseCaseError(
        'DEPENDENCY_UNAVAILABLE',
        'Instagram или webhook не подключён.',
      )

    await deps.enqueue({
      kind: 'comment',
      accountId: connection.accountId,
      commentId,
      mediaId: campaign.mediaId,
      text,
    })
    return { queued: true as const }
  }
}
