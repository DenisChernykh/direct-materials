import {
  claimFailedPublicReply,
  claimPublicReply,
  deleteOldDeliveries,
  getDeliveryByCampaignComment,
  listBackfillablePublicReplies,
  listFailedPublicReplies,
  listRecentDeliveries,
  updatePublicReply,
} from '../../../infrastructure/db'
import type { Delivery as DeliveryRow } from '../../../infrastructure/db'
import type { Delivery, PublicReplyStatus } from '../application'
import { toIsoTimestamp } from '../../../infrastructure/time'

function mapDelivery(row: DeliveryRow & { campaign_name?: string }): Delivery {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    campaignRevision: row.campaign_revision,
    commentId: row.comment_id,
    recipientId: row.recipient_id,
    status: row.status,
    publicReplyText: row.public_reply_text,
    publicReplyStatus: row.public_reply_status,
    publicReplyErrorCode: row.public_reply_error_code,
    errorCode: row.error_code,
    createdAt: toIsoTimestamp(row.created_at),
    updatedAt: toIsoTimestamp(row.updated_at),
    deliveredAt: toIsoTimestamp(row.delivered_at),
    ...(row.campaign_name ? { campaignName: row.campaign_name } : {}),
  }
}

export function createDeliveryRepository(db: D1Database) {
  return {
    recent: async (limit: number) =>
      (await listRecentDeliveries(db, limit)).map(mapDelivery),
    findByComment: async (campaignId: string, commentId: string) => {
      const row = await getDeliveryByCampaignComment(db, campaignId, commentId)
      return row ? mapDelivery(row) : null
    },
    backfillable: async (campaignId: string) =>
      (await listBackfillablePublicReplies(db, campaignId)).map(mapDelivery),
    failed: async (campaignId: string) =>
      (await listFailedPublicReplies(db, campaignId)).map(mapDelivery),
    claim: (id: string, text: string) => claimPublicReply(db, id, text),
    claimFailed: (id: string, previousText: string | null, retryText: string) =>
      claimFailedPublicReply(db, id, previousText, retryText),
    updatePublicReply: (
      id: string,
      update: { status: PublicReplyStatus; errorCode?: string | null },
    ) => updatePublicReply(db, id, update),
    cleanup: () => deleteOldDeliveries(db),
  }
}
