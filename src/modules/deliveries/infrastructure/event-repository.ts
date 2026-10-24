import {
  bindNextCampaignToMedia,
  claimDeliveryAction,
  createDelivery,
  getActiveCampaignByMedia,
  getActiveCampaignByTriggerMode,
  getConnection,
  getDelivery,
  updateDelivery,
  updatePublicReply,
} from '../../../infrastructure/db'
import type {
  CampaignWithKeywords,
  Delivery as DeliveryRow,
} from '../../../infrastructure/db'
import type { DeliveryCampaignInput } from '../../../infrastructure/db'
import { decryptToken } from '../../../security/crypto'
import { toIsoTimestamp } from '../../../infrastructure/time'
import type {
  Campaign,
  ConnectedInstagram,
  Delivery,
  DeliveryEventRepository,
  Media,
} from '../application/process-event'

function mapCampaign(row: CampaignWithKeywords): Campaign {
  return {
    id: row.id,
    revision: row.revision,
    triggerMode: row.trigger_mode,
    mediaId: row.media_id,
    armedAt: toIsoTimestamp(row.armed_at),
    matchMode: row.match_mode,
    keywords: row.keywords,
    initialMessage: row.initial_message,
    initialButtonText: row.initial_button_text,
    followMessage: row.follow_message,
    recheckButtonText: row.recheck_button_text,
    deliveryMessage: row.delivery_message,
    unavailableMessage: row.unavailable_message,
    materialUrl: row.material_url,
    publicReplyEnabled: row.public_reply_enabled === 1,
    publicReplyVariants: row.public_reply_variants,
  }
}

function mapDelivery(row: DeliveryRow): Delivery {
  return {
    id: row.id,
    status: row.status,
    initialMessage: row.initial_message,
    initialButtonText: row.initial_button_text,
    followMessage: row.follow_message,
    recheckButtonText: row.recheck_button_text,
    deliveryMessage: row.delivery_message,
    unavailableMessage: row.unavailable_message,
    materialUrl: row.material_url,
    publicReplyText: row.public_reply_text,
    publicReplyStatus: row.public_reply_status,
  }
}

export function createDeliveryEventRepository(
  db: D1Database,
  encryptionKey: string,
): DeliveryEventRepository {
  return {
    async connection(): Promise<ConnectedInstagram | null> {
      const row = await getConnection(db)
      if (!row || row.status !== 'connected' || row.webhook_subscribed !== 1)
        return null
      return {
        accountId: row.account_id,
        token: await decryptToken(
          row.token_ciphertext,
          row.token_iv,
          encryptionKey,
        ),
      }
    },
    async activeByMedia(mediaId) {
      const row = await getActiveCampaignByMedia(db, mediaId)
      return row ? mapCampaign(row) : null
    },
    async activeByTrigger(mode) {
      const row = await getActiveCampaignByTriggerMode(db, mode)
      return row ? mapCampaign(row) : null
    },
    async bindNext(id, media: Media) {
      const row = await bindNextCampaignToMedia(db, id, media)
      return row ? mapCampaign(row) : null
    },
    async create(campaign, commentId) {
      const deliveryCampaign: DeliveryCampaignInput = {
        id: campaign.id,
        revision: campaign.revision,
        initialMessage: campaign.initialMessage,
        initialButtonText: campaign.initialButtonText,
        followMessage: campaign.followMessage,
        recheckButtonText: campaign.recheckButtonText,
        deliveryMessage: campaign.deliveryMessage,
        unavailableMessage: campaign.unavailableMessage,
        materialUrl: campaign.materialUrl,
        publicReplyEnabled: campaign.publicReplyEnabled,
        publicReplyVariants: campaign.publicReplyVariants,
      }
      const row = await createDelivery(db, deliveryCampaign, commentId)
      return row ? mapDelivery(row) : null
    },
    async get(id) {
      const row = await getDelivery(db, id)
      return row ? mapDelivery(row) : null
    },
    claimAction: (id, eventId, recipientId) =>
      claimDeliveryAction(db, id, eventId, recipientId),
    update: (id, update) => updateDelivery(db, id, update),
    updatePublicReply: (id, update) => updatePublicReply(db, id, update),
  }
}
