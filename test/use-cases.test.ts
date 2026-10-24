import { describe, expect, it, vi } from 'vitest'
import {
  CampaignUseCaseError,
  createCampaignUseCases,
} from '../src/modules/campaigns/application'
import type { CampaignRepository } from '../src/modules/campaigns/application'
import { createDeliveryUseCases } from '../src/modules/deliveries/application'
import { createInstagramOAuthUseCase } from '../src/modules/instagram-connection/application/oauth'

describe('campaign use cases', () => {
  it("always creates a draft regardless of the caller's form state", async () => {
    const save = vi.fn().mockResolvedValue('campaign-1')
    const repository = {
      list: vi.fn(),
      get: vi.fn(),
      save,
      setStatus: vi.fn(),
      findStatusConflict: vi.fn(),
      counters: vi.fn(),
    } as unknown as CampaignRepository
    const useCases = createCampaignUseCases({
      repository,
      connection: { get: vi.fn() },
    })

    await useCases.createDraft({
      name: 'Lead magnet',
      mediaId: 'media-1',
      triggerMode: 'specific',
      matchMode: 'contains',
      keywords: ['guide'],
      initialMessage: 'Hello',
      initialButtonText: 'Get',
      followMessage: 'Follow',
      recheckButtonText: 'Check',
      deliveryMessage: 'Here',
      unavailableMessage: 'Try later',
      materialUrl: 'https://example.com/material',
      publicReplyEnabled: false,
      publicReplyVariants: [],
      mediaPermalink: null,
    })

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'draft' }),
    )
  })

  it('owns update status preservation and activation preconditions', async () => {
    const current = {
      id: 'campaign-1',
      status: 'draft' as const,
      triggerMode: 'any' as const,
    }
    const repository = {
      list: vi.fn(),
      get: vi.fn().mockResolvedValue(current),
      save: vi.fn().mockResolvedValue('campaign-1'),
      setStatus: vi.fn(),
      findStatusConflict: vi.fn().mockResolvedValue(null),
      counters: vi.fn(),
    } as unknown as CampaignRepository
    const connection = { get: vi.fn().mockResolvedValue(null) }
    const useCases = createCampaignUseCases({ repository, connection })
    const input = {
      name: 'Lead magnet',
      mediaId: '',
      triggerMode: 'any' as const,
      matchMode: 'contains' as const,
      keywords: ['guide'],
      initialMessage: 'Hello',
      initialButtonText: 'Get',
      followMessage: 'Follow',
      recheckButtonText: 'Check',
      deliveryMessage: 'Here',
      unavailableMessage: 'Try later',
      materialUrl: 'https://example.com/material',
      publicReplyEnabled: false,
      publicReplyVariants: [],
      mediaPermalink: null,
    }

    await useCases.update('campaign-1', input)
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'campaign-1', status: 'draft' }),
    )
    await expect(useCases.setStatus('campaign-1', 'active')).rejects.toEqual(
      new CampaignUseCaseError(
        'DEPENDENCY_UNAVAILABLE',
        'Сначала подключите Instagram и webhook.',
      ),
    )
  })

  it('rejects changing the trigger mode of an active campaign in application', async () => {
    const repository = {
      list: vi.fn(),
      get: vi.fn().mockResolvedValue({
        id: 'campaign-1',
        status: 'active',
        triggerMode: 'any',
      }),
      save: vi.fn(),
      setStatus: vi.fn(),
      findStatusConflict: vi.fn(),
      counters: vi.fn(),
    } as unknown as CampaignRepository
    const useCases = createCampaignUseCases({
      repository,
      connection: { get: vi.fn() },
    })
    await expect(
      useCases.update('campaign-1', {
        name: 'Campaign',
        mediaId: 'media-1',
        triggerMode: 'specific',
        matchMode: 'contains',
        keywords: ['guide'],
        initialMessage: 'Hello',
        initialButtonText: 'Get',
        followMessage: 'Follow',
        recheckButtonText: 'Check',
        deliveryMessage: 'Here',
        unavailableMessage: 'Try later',
        materialUrl: 'https://example.com/material',
        publicReplyEnabled: false,
        publicReplyVariants: [],
        mediaPermalink: null,
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(repository.save).not.toHaveBeenCalled()
  })
})

describe('delivery use cases', () => {
  it('keeps history and cleanup behind the repository port', async () => {
    const recent = vi.fn().mockResolvedValue([])
    const cleanup = vi.fn().mockResolvedValue(4)
    const repository = {
      recent,
      backfillable: vi.fn(),
      failed: vi.fn(),
      claim: vi.fn(),
      claimFailed: vi.fn(),
      updatePublicReply: vi.fn(),
      cleanup,
    } as never
    const useCases = createDeliveryUseCases(repository)

    await expect(useCases.history(50)).resolves.toEqual([])
    await expect(useCases.cleanup()).resolves.toBe(4)
    expect(recent).toHaveBeenCalledWith(50)
    expect(cleanup).toHaveBeenCalledOnce()
  })
})

describe('instagram OAuth use case', () => {
  it('persists a connected account using injected gateway, cipher, and clock', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const gateway = {
      exchangeAuthorizationCode: vi.fn().mockResolvedValue({
        ok: true,
        value: { accessToken: 'short-token', permissions: ['comments'] },
      }),
      exchangeLongLivedToken: vi.fn().mockResolvedValue({
        ok: true,
        value: { accessToken: 'long-token', expiresIn: 3600 },
      }),
      getOwnProfile: vi.fn().mockResolvedValue({
        ok: true,
        value: { accountId: 'account-1', username: 'owner' },
      }),
      subscribeToWebhooks: vi.fn().mockResolvedValue({ ok: true, value: true }),
    }
    const useCase = createInstagramOAuthUseCase({
      gateway,
      state: { verify: vi.fn().mockResolvedValue(true) },
      cipher: {
        encrypt: vi.fn().mockResolvedValue({ ciphertext: 'cipher', iv: 'iv' }),
      },
      clock: { now: () => Date.parse('2026-08-26T10:00:00.000Z') },
      repository: { save },
      redirectUri: 'https://example.com/oauth/instagram/callback',
      successRedirect: '/admin?connected=1',
    })

    await expect(useCase.complete('code', 'signed-state')).resolves.toEqual({
      status: 302,
      redirect: '/admin?connected=1',
      message: '',
    })
    expect(save).toHaveBeenCalledWith({
      accountId: 'account-1',
      username: 'owner',
      tokenCiphertext: 'cipher',
      tokenIv: 'iv',
      tokenExpiresAt: '2026-08-26T11:00:00.000Z',
      permissions: ['comments'],
      status: 'connected',
      webhookSubscribed: true,
    })
  })

  it('fails closed for an invalid or expired state before contacting Instagram', async () => {
    const exchange = vi.fn()
    const useCase = createInstagramOAuthUseCase({
      gateway: {
        exchangeAuthorizationCode: exchange,
        exchangeLongLivedToken: vi.fn(),
        getOwnProfile: vi.fn(),
        subscribeToWebhooks: vi.fn(),
      },
      state: { verify: vi.fn().mockResolvedValue(false) },
      cipher: { encrypt: vi.fn() },
      clock: { now: Date.now },
      repository: { save: vi.fn() },
      redirectUri: 'https://example.com/oauth/instagram/callback',
      successRedirect: '/admin?connected=1',
    })

    await expect(useCase.complete('code', 'expired-state')).resolves.toEqual({
      status: 400,
      message: 'Instagram вернул некорректный OAuth-запрос.',
    })
    expect(exchange).not.toHaveBeenCalled()
  })
})
