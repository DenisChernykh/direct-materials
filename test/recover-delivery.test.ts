import { describe, expect, it, vi } from 'vitest'
import type { Campaign } from '../src/modules/campaigns/application'
import type { DeliveryRepository } from '../src/modules/deliveries/application'
import {
  createRecoverDeliveryUseCase,
  RecoverDeliveryUseCaseError,
} from '../src/modules/deliveries/application/recover-delivery'
import type { InstagramConnectionRepository } from '../src/modules/instagram-connection/application'

const campaign: Campaign = {
  id: 'campaign-1',
  name: 'Blog tour',
  mediaId: 'media-1',
  mediaPermalink: null,
  triggerMode: 'specific',
  armedAt: null,
  matchMode: 'contains',
  keywords: ['блог-тур'],
  initialMessage: 'Hello',
  initialButtonText: 'Get',
  followMessage: 'Follow',
  recheckButtonText: 'Check',
  deliveryMessage: 'Material',
  unavailableMessage: 'Unavailable',
  materialUrl: 'https://example.com/material',
  publicReplyEnabled: true,
  publicReplyVariants: ['Sent'],
  status: 'active',
  revision: 1,
  createdAt: '2026-08-27T00:00:00.000Z',
  updatedAt: '2026-08-27T00:00:00.000Z',
}

function setup(overrides: { existing?: boolean; connected?: boolean } = {}) {
  const enqueue = vi.fn().mockResolvedValue(undefined)
  const recover = createRecoverDeliveryUseCase({
    campaigns: {
      get: vi.fn().mockResolvedValue(campaign),
    } as never,
    deliveries: {
      findByComment: vi
        .fn()
        .mockResolvedValue(overrides.existing ? { id: 'delivery-1' } : null),
    } as unknown as DeliveryRepository,
    connection: {
      get: vi.fn().mockResolvedValue(
        overrides.connected === false
          ? null
          : {
              accountId: 'account-1',
              status: 'connected',
              webhookSubscribed: true,
            },
      ),
    } as unknown as InstagramConnectionRepository,
    enqueue,
  })
  return { recover, enqueue }
}

describe('recover delivery use case', () => {
  it('queues the normal comment event after normalizing a spaced dash', async () => {
    const { recover, enqueue } = setup()

    await expect(
      recover('campaign-1', '18083879864430633', 'Блог - тур'),
    ).resolves.toEqual({ queued: true })
    expect(enqueue).toHaveBeenCalledWith({
      kind: 'comment',
      accountId: 'account-1',
      commentId: '18083879864430633',
      mediaId: 'media-1',
      text: 'Блог - тур',
    })
  })

  it('rejects a duplicate delivery before enqueueing', async () => {
    const { recover, enqueue } = setup({ existing: true })

    await expect(
      recover('campaign-1', '18083879864430633', 'Блог - тур'),
    ).rejects.toEqual(
      new RecoverDeliveryUseCaseError(
        'CONFLICT',
        'Доставка для этого комментария уже существует.',
      ),
    )
    expect(enqueue).not.toHaveBeenCalled()
  })

  it('rejects text that does not match the campaign', async () => {
    const { recover, enqueue } = setup()

    await expect(
      recover('campaign-1', '18083879864430633', 'Другой комментарий'),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
    expect(enqueue).not.toHaveBeenCalled()
  })
})
