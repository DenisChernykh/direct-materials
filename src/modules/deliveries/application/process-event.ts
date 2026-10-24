import { matchesAnyKeyword } from '../../../campaigns/matching'
import { nextMediaAfter } from '../../../campaigns/trigger'

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

export type Campaign = {
  id: string
  revision: number
  triggerMode: 'specific' | 'any' | 'next'
  mediaId: string
  armedAt: string | null
  matchMode: 'contains' | 'exact'
  keywords: string[]
  initialMessage: string
  initialButtonText: string
  followMessage: string
  recheckButtonText: string
  deliveryMessage: string
  unavailableMessage: string
  materialUrl: string
  publicReplyEnabled: boolean
  publicReplyVariants: string[]
}
export type Delivery = {
  id: string
  status:
    | 'received'
    | 'initial_dm_sent'
    | 'waiting_for_follow'
    | 'delivered'
    | 'failed'
    | 'unknown'
  initialMessage: string
  initialButtonText: string
  followMessage: string
  recheckButtonText: string
  deliveryMessage: string
  unavailableMessage: string
  materialUrl: string
  publicReplyText: string | null
  publicReplyStatus: 'disabled' | 'pending' | 'sent' | 'failed' | 'unknown'
}
export type ConnectedInstagram = { accountId: string; token: string }
export type Media = { id: string; timestamp?: string; permalink?: string }
export type ProviderFailure = {
  ok: false
  kind: 'retryable' | 'failed' | 'unknown'
  code: string
}
export type ProviderResult<T> = { ok: true; value: T } | ProviderFailure

export type DeliveryEventRepository = {
  connection: () => Promise<ConnectedInstagram | null>
  activeByMedia: (mediaId: string) => Promise<Campaign | null>
  activeByTrigger: (mode: 'any' | 'next') => Promise<Campaign | null>
  bindNext: (id: string, media: Media) => Promise<Campaign | null>
  create: (campaign: Campaign, commentId: string) => Promise<Delivery | null>
  get: (id: string) => Promise<Delivery | null>
  claimAction: (
    id: string,
    eventId: string,
    recipientId: string,
  ) => Promise<boolean>
  update: (
    id: string,
    update: {
      status: Delivery['status']
      recipientId?: string
      errorCode?: string | null
    },
  ) => Promise<void>
  updatePublicReply: (
    id: string,
    update: {
      status: Delivery['publicReplyStatus']
      errorCode?: string | null
    },
  ) => Promise<void>
}

export type DeliveryEventGateway = {
  listMedia: (token: string) => Promise<ProviderResult<Media[]>>
  sendPrivateReply: (
    accountId: string,
    commentId: string,
    text: string,
    button: { title: string; payload: string },
    token: string,
  ) => Promise<ProviderResult<{ recipientId: string }>>
  sendCommentReply: (
    commentId: string,
    text: string,
    token: string,
  ) => Promise<ProviderResult<unknown>>
  getFollowerStatus: (
    recipientId: string,
    token: string,
  ) => Promise<ProviderResult<boolean | null>>
  sendMessage: (
    accountId: string,
    recipientId: string,
    text: string,
    token: string,
    button?: { title: string; payload: string },
  ) => Promise<ProviderResult<unknown>>
}

const payloadPrefix = 'material-delivery'

export function actionPayload(
  deliveryId: string,
  action: 'get' | 'recheck',
): string {
  return `${payloadPrefix}:${deliveryId}:${action}`
}

export function parseActionPayload(
  payload: string,
): { deliveryId: string; action: 'get' | 'recheck' } | null {
  const [prefix, deliveryId, action, extra] = payload.split(':')
  if (prefix !== payloadPrefix || !deliveryId || extra) return null
  if (action !== 'get' && action !== 'recheck') return null
  return { deliveryId, action }
}

export type FollowerDecision = 'deliver' | 'request_follow' | 'unavailable'
export function followerDecision(
  result: boolean | null | undefined,
): FollowerDecision {
  if (result === true) return 'deliver'
  if (result === false) return 'request_follow'
  return 'unavailable'
}

function campaignMatches(campaign: Campaign | null, text: string): boolean {
  return Boolean(
    campaign && matchesAnyKeyword(text, campaign.keywords, campaign.matchMode),
  )
}

export function createProcessInstagramEvent(deps: {
  repository: DeliveryEventRepository
  gateway: DeliveryEventGateway
}) {
  async function campaignForComment(
    event: InstagramCommentEvent,
    connection: ConnectedInstagram,
  ): Promise<Campaign | null> {
    const specific = await deps.repository.activeByMedia(event.mediaId)
    if (campaignMatches(specific, event.text)) return specific

    const next = await deps.repository.activeByTrigger('next')
    if (next?.armedAt) {
      const mediaResult = await deps.gateway.listMedia(connection.token)
      if (!mediaResult.ok) {
        if (mediaResult.kind === 'retryable')
          throw new Error('InstagramNextMediaLookupFailed')
      } else {
        const target = nextMediaAfter(mediaResult.value, next.armedAt)
        if (target) {
          const bound = await deps.repository.bindNext(next.id, target)
          if (target.id === event.mediaId && campaignMatches(bound, event.text))
            return bound
        }
      }
    }

    const any = await deps.repository.activeByTrigger('any')
    return campaignMatches(any, event.text) ? any : null
  }

  async function processComment(event: InstagramCommentEvent): Promise<void> {
    const connection = await deps.repository.connection()
    if (!connection || connection.accountId !== event.accountId) return
    const campaign = await campaignForComment(event, connection)
    if (!campaign) return
    const delivery = await deps.repository.create(campaign, event.commentId)
    if (!delivery) return

    const result = await deps.gateway.sendPrivateReply(
      connection.accountId,
      event.commentId,
      delivery.initialMessage,
      {
        title: delivery.initialButtonText,
        payload: actionPayload(delivery.id, 'get'),
      },
      connection.token,
    )
    if (!result.ok) {
      await deps.repository.update(delivery.id, {
        status: result.kind === 'unknown' ? 'unknown' : 'failed',
        errorCode: result.code,
      })
      return
    }
    await deps.repository.update(delivery.id, {
      status: 'initial_dm_sent',
      recipientId: result.value.recipientId,
    })
    if (delivery.publicReplyStatus !== 'pending' || !delivery.publicReplyText)
      return
    const publicReply = await deps.gateway.sendCommentReply(
      event.commentId,
      delivery.publicReplyText,
      connection.token,
    )
    await deps.repository.updatePublicReply(delivery.id, {
      status: publicReply.ok
        ? 'sent'
        : publicReply.kind === 'unknown'
          ? 'unknown'
          : 'failed',
      errorCode: publicReply.ok ? null : publicReply.code,
    })
  }

  async function processAction(event: InstagramActionEvent): Promise<void> {
    const parsed = parseActionPayload(event.payload)
    if (!parsed) return
    const connection = await deps.repository.connection()
    if (!connection || connection.accountId !== event.accountId) return
    const delivery = await deps.repository.get(parsed.deliveryId)
    if (!delivery || delivery.status === 'delivered') return
    if (
      !(await deps.repository.claimAction(
        delivery.id,
        event.eventId,
        event.recipientId,
      ))
    )
      return

    const follower = await deps.gateway.getFollowerStatus(
      event.recipientId,
      connection.token,
    )
    const decision = followerDecision(follower.ok ? follower.value : null)
    if (decision === 'deliver') {
      const result = await deps.gateway.sendMessage(
        connection.accountId,
        event.recipientId,
        `${delivery.deliveryMessage}\n${delivery.materialUrl}`,
        connection.token,
      )
      await deps.repository.update(delivery.id, {
        status: result.ok
          ? 'delivered'
          : result.kind === 'unknown'
            ? 'unknown'
            : 'failed',
        recipientId: event.recipientId,
        errorCode: result.ok ? null : result.code,
      })
      return
    }
    const unavailable = decision === 'unavailable'
    const result = await deps.gateway.sendMessage(
      connection.accountId,
      event.recipientId,
      unavailable ? delivery.unavailableMessage : delivery.followMessage,
      connection.token,
      {
        title: delivery.recheckButtonText,
        payload: actionPayload(delivery.id, 'recheck'),
      },
    )
    await deps.repository.update(delivery.id, {
      status: result.ok
        ? unavailable
          ? 'unknown'
          : 'waiting_for_follow'
        : 'unknown',
      recipientId: event.recipientId,
      errorCode: result.ok ? (follower.ok ? null : follower.code) : result.code,
    })
  }

  return async (event: InstagramEvent): Promise<void> => {
    if (event.kind === 'comment') await processComment(event)
    else await processAction(event)
  }
}
