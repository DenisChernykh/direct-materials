import { Hono } from 'hono'
import { z } from 'zod'
import type { AppContext } from '../../../shared/app-context'
import type { CampaignWrite } from '../application'
import { ApiError } from '../../../shared/api-error'
import { jsonBody } from '../../../shared/http'
import { CampaignUseCaseError, createCampaignUseCases } from '../application'
import { createInstagramConnectionUseCases } from '../../instagram-connection/application'

export const campaignWriteSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(100),
    mediaId: z.string().trim().max(300),
    mediaPermalink: z.string().url().nullable().optional(),
    triggerMode: z.enum(['specific', 'any', 'next']),
    matchMode: z.enum(['contains', 'exact']),
    keywords: z.array(z.string().trim().min(1).max(100)).min(1).max(50),
    initialMessage: z.string().trim().min(1).max(900),
    initialButtonText: z.string().trim().min(1).max(20),
    followMessage: z.string().trim().min(1).max(900),
    recheckButtonText: z.string().trim().min(1).max(20),
    deliveryMessage: z.string().trim().min(1).max(900),
    unavailableMessage: z.string().trim().min(1).max(900),
    materialUrl: z
      .string()
      .url()
      .refine((value) => value.startsWith('https://'), {
        message: 'materialUrl must use https',
      }),
    publicReplyEnabled: z.boolean(),
    publicReplyVariants: z.array(z.string().trim().min(1).max(300)).max(10),
  })
  .refine(
    (value) => value.triggerMode !== 'specific' || value.mediaId.length > 0,
    {
      message: 'mediaId is required for a specific campaign',
      path: ['mediaId'],
    },
  )
  .refine(
    (value) =>
      !value.publicReplyEnabled || value.publicReplyVariants.length > 0,
    {
      message:
        'publicReplyVariants is required when public replies are enabled',
      path: ['publicReplyVariants'],
    },
  )

const statusSchema = z.strictObject({ status: z.enum(['active', 'paused']) })

function toCampaignInput(
  body: z.infer<typeof campaignWriteSchema>,
): CampaignWrite {
  return {
    name: body.name,
    mediaId: body.mediaId,
    mediaPermalink: body.mediaPermalink ?? null,
    triggerMode: body.triggerMode,
    matchMode: body.matchMode,
    keywords: body.keywords,
    initialMessage: body.initialMessage,
    initialButtonText: body.initialButtonText,
    followMessage: body.followMessage,
    recheckButtonText: body.recheckButtonText,
    deliveryMessage: body.deliveryMessage,
    unavailableMessage: body.unavailableMessage,
    materialUrl: body.materialUrl,
    publicReplyEnabled: body.publicReplyEnabled,
    publicReplyVariants: body.publicReplyVariants,
  }
}

function campaignError(error: unknown): ApiError | null {
  if (!(error instanceof CampaignUseCaseError)) return null
  const status =
    error.code === 'NOT_FOUND'
      ? 404
      : error.code === 'CONFLICT'
        ? 409
        : error.code === 'DEPENDENCY_UNAVAILABLE'
          ? 502
          : 400
  return new ApiError(error.code, error.message, status)
}

function useCases(c: Parameters<typeof createCampaignUseCases>[0]) {
  return createCampaignUseCases(c)
}

export function createCampaignRoutes() {
  return new Hono<AppContext>()
    .get('/dashboard', async (c) => {
      const repositories = c.get('repositories')
      const campaigns = useCases({
        repository: repositories.campaigns,
        connection: repositories.instagram,
      })
      const [connection, dashboard] = await Promise.all([
        repositories.instagram.get(),
        campaigns.dashboard(),
      ])
      const [campaignRows, counterRows] = dashboard
      return c.json({
        connection,
        campaigns: campaignRows,
        counters: counterRows,
      })
    })
    .get('/media', async (c) => {
      const instagram = createInstagramConnectionUseCases(
        c.get('repositories').instagram,
      )
      return c.json({ media: await instagram.listMedia() })
    })
    .post('/campaigns', jsonBody(campaignWriteSchema), async (c) => {
      const body = c.req.valid('json')
      const repositories = c.get('repositories')
      const campaigns = useCases({
        repository: repositories.campaigns,
        connection: repositories.instagram,
      })
      try {
        const id = await campaigns.createDraft(toCampaignInput(body))
        const campaign = await campaigns.get(id)
        return c.json({ campaign }, 201)
      } catch (error) {
        throw campaignError(error) ?? error
      }
    })
    .get('/campaigns/:id', async (c) => {
      const repositories = c.get('repositories')
      const campaigns = useCases({
        repository: repositories.campaigns,
        connection: repositories.instagram,
      })
      const campaign = await campaigns.get(c.req.param('id'))
      if (!campaign)
        throw new ApiError('NOT_FOUND', 'Кампания не найдена.', 404)
      const [backfillable, failed] = await Promise.all([
        repositories.deliveries.backfillable(campaign.id),
        repositories.deliveries.failed(campaign.id),
      ])
      return c.json({
        campaign: {
          ...campaign,
          backfillablePublicReplyCount: backfillable.length,
          failedPublicReplyCount: failed.length,
        },
      })
    })
    .put('/campaigns/:id', jsonBody(campaignWriteSchema), async (c) => {
      const id = c.req.param('id')
      const repositories = c.get('repositories')
      const campaigns = useCases({
        repository: repositories.campaigns,
        connection: repositories.instagram,
      })
      const body = c.req.valid('json')
      try {
        await campaigns.update(id, toCampaignInput(body))
      } catch (error) {
        throw campaignError(error) ?? error
      }
      const campaign = await campaigns.get(id)
      return c.json({ campaign })
    })
    .put('/campaigns/:id/status', jsonBody(statusSchema), async (c) => {
      const id = c.req.param('id')
      const repositories = c.get('repositories')
      const campaigns = useCases({
        repository: repositories.campaigns,
        connection: repositories.instagram,
      })
      const body = c.req.valid('json')
      try {
        await campaigns.setStatus(id, body.status)
      } catch (error) {
        throw campaignError(error) ?? error
      }
      const updated = await campaigns.get(id)
      return c.json({ campaign: updated })
    })
}
