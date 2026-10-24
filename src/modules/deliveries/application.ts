export type DeliveryStatus =
  | 'received'
  | 'initial_dm_sent'
  | 'waiting_for_follow'
  | 'delivered'
  | 'failed'
  | 'unknown'
export type PublicReplyStatus =
  'disabled' | 'pending' | 'sent' | 'failed' | 'unknown'
export type Delivery = {
  id: string
  campaignId: string
  campaignRevision: number
  commentId: string
  recipientId: string | null
  status: DeliveryStatus
  publicReplyText: string | null
  publicReplyStatus: PublicReplyStatus
  publicReplyErrorCode: string | null
  errorCode: string | null
  createdAt: string
  updatedAt: string
  deliveredAt: string | null
  campaignName?: string
}

export type DeliveryRepository = {
  recent: (limit: number) => Promise<Delivery[]>
  findByComment: (
    campaignId: string,
    commentId: string,
  ) => Promise<Delivery | null>
  backfillable: (campaignId: string) => Promise<Delivery[]>
  failed: (campaignId: string) => Promise<Delivery[]>
  claim: (id: string, text: string) => Promise<boolean>
  claimFailed: (
    id: string,
    previousText: string | null,
    retryText: string,
  ) => Promise<boolean>
  updatePublicReply: (
    id: string,
    update: { status: PublicReplyStatus; errorCode?: string | null },
  ) => Promise<void>
  cleanup: () => Promise<number>
}

/** Delivery use cases expose intent-oriented operations to HTTP and cron adapters. */
export function createDeliveryUseCases(repository: DeliveryRepository) {
  return {
    history: (limit: number) => repository.recent(limit),
    findByComment: (campaignId: string, commentId: string) =>
      repository.findByComment(campaignId, commentId),
    backfillable: (campaignId: string) => repository.backfillable(campaignId),
    failed: (campaignId: string) => repository.failed(campaignId),
    claim: (id: string, text: string) => repository.claim(id, text),
    claimFailed: (id: string, previousText: string | null, retryText: string) =>
      repository.claimFailed(id, previousText, retryText),
    updatePublicReply: repository.updatePublicReply,
    cleanup: repository.cleanup,
  }
}
