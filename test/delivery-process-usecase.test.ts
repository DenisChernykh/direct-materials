import { describe, expect, it, vi } from 'vitest'
import {
  createProcessInstagramEvent,
  type Campaign,
  type Delivery,
  type DeliveryEventGateway,
  type DeliveryEventRepository,
} from '../src/modules/deliveries/application/process-event'

const campaign: Campaign = {
  id: 'campaign-1',
  revision: 2,
  triggerMode: 'specific',
  mediaId: 'media-1',
  armedAt: null,
  matchMode: 'contains',
  keywords: ['guide'],
  initialMessage: 'Here is the guide',
  initialButtonText: 'Get',
  followMessage: 'Follow first',
  recheckButtonText: 'Check',
  deliveryMessage: 'Your material:',
  unavailableMessage: 'Try again later',
  materialUrl: 'https://example.com/material',
  publicReplyEnabled: true,
  publicReplyVariants: ['Sent'],
}

const delivery: Delivery = {
  id: 'delivery-1',
  status: 'received',
  initialMessage: campaign.initialMessage,
  initialButtonText: campaign.initialButtonText,
  followMessage: campaign.followMessage,
  recheckButtonText: campaign.recheckButtonText,
  deliveryMessage: campaign.deliveryMessage,
  unavailableMessage: campaign.unavailableMessage,
  materialUrl: campaign.materialUrl,
  publicReplyText: 'Sent',
  publicReplyStatus: 'pending',
}

function repository(
  overrides: Partial<DeliveryEventRepository> = {},
): DeliveryEventRepository {
  return {
    connection: vi
      .fn()
      .mockResolvedValue({ accountId: 'account-1', token: 'token' }),
    activeByMedia: vi.fn().mockResolvedValue(campaign),
    activeByTrigger: vi.fn().mockResolvedValue(null),
    bindNext: vi.fn(),
    create: vi.fn().mockResolvedValue(delivery),
    get: vi.fn(),
    claimAction: vi.fn().mockResolvedValue(true),
    update: vi.fn().mockResolvedValue(undefined),
    updatePublicReply: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function gateway(
  overrides: Partial<DeliveryEventGateway> = {},
): DeliveryEventGateway {
  return {
    listMedia: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    sendPrivateReply: vi
      .fn()
      .mockResolvedValue({ ok: true, value: { recipientId: 'recipient-1' } }),
    sendCommentReply: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    getFollowerStatus: vi.fn().mockResolvedValue({ ok: true, value: true }),
    sendMessage: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    ...overrides,
  }
}

describe('delivery event use case', () => {
  it('does not send a second private message for a duplicate comment', async () => {
    const repositoryPort = repository({
      create: vi.fn().mockResolvedValue(null),
    })
    const gatewayPort = gateway()
    const process = createProcessInstagramEvent({
      repository: repositoryPort,
      gateway: gatewayPort,
    })

    await process({
      kind: 'comment',
      accountId: 'account-1',
      commentId: 'comment-1',
      mediaId: 'media-1',
      text: 'guide',
    })

    expect(gatewayPort.sendPrivateReply).not.toHaveBeenCalled()
  })

  it('sends Direct before the public reply', async () => {
    const order: string[] = []
    const gatewayPort = gateway({
      sendPrivateReply: vi.fn().mockImplementation(async () => {
        order.push('direct')
        return { ok: true, value: { recipientId: 'recipient-1' } }
      }),
      sendCommentReply: vi.fn().mockImplementation(async () => {
        order.push('public')
        return { ok: true, value: {} }
      }),
    })
    const process = createProcessInstagramEvent({
      repository: repository(),
      gateway: gatewayPort,
    })

    await process({
      kind: 'comment',
      accountId: 'account-1',
      commentId: 'comment-1',
      mediaId: 'media-1',
      text: 'guide',
    })

    expect(order).toEqual(['direct', 'public'])
  })

  it.each([
    [false, 'waiting_for_follow', 'Follow first'],
    [null, 'unknown', 'Try again later'],
  ] as const)(
    'does not reveal a material for follower=%s',
    async (follower, status, text) => {
      const repositoryPort = repository({
        get: vi.fn().mockResolvedValue(delivery),
      })
      const gatewayPort = gateway({
        getFollowerStatus: vi
          .fn()
          .mockResolvedValue({ ok: true, value: follower }),
      })
      const process = createProcessInstagramEvent({
        repository: repositoryPort,
        gateway: gatewayPort,
      })

      await process({
        kind: 'action',
        accountId: 'account-1',
        recipientId: 'recipient-1',
        eventId: 'event-1',
        payload: 'material-delivery:delivery-1:get',
      })

      expect(gatewayPort.sendMessage).toHaveBeenCalledWith(
        'account-1',
        'recipient-1',
        text,
        'token',
        expect.any(Object),
      )
      expect(repositoryPort.update).toHaveBeenCalledWith(
        'delivery-1',
        expect.objectContaining({ status }),
      )
      expect(gatewayPort.sendMessage).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.stringContaining(campaign.materialUrl),
        expect.anything(),
      )
    },
  )
})
