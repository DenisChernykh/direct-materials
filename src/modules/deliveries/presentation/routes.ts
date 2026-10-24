import { Hono } from 'hono'
import { z } from 'zod'
import type { AppContext } from '../../../shared/app-context'
import { ApiError } from '../../../shared/api-error'
import { jsonBody } from '../../../shared/http'
import { createDeliveryUseCases } from '../application'
import { PublicReplyUseCaseError } from '../application/public-replies'
import {
  createRecoverDeliveryUseCase,
  RecoverDeliveryUseCaseError,
} from '../application/recover-delivery'

const expectedCountSchema = z.strictObject({
  expectedCount: z.number().int().min(1).max(20),
})

const recoverDeliverySchema = z.strictObject({
  commentId: z.string().regex(/^\d+$/u).max(100),
  text: z.string().trim().min(1).max(2200),
})

function publicReplyError(error: unknown): ApiError | null {
  if (!(error instanceof PublicReplyUseCaseError)) return null
  const status =
    error.code === 'NOT_FOUND' ? 404 : error.code === 'CONFLICT' ? 409 : 502
  return new ApiError(error.code, error.message, status)
}

function recoverDeliveryError(error: unknown): ApiError | null {
  if (!(error instanceof RecoverDeliveryUseCaseError)) return null
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

export function createDeliveryRoutes() {
  return new Hono<AppContext>()
    .get('/history', async (c) => {
      const deliveries = createDeliveryUseCases(
        c.get('repositories').deliveries,
      )
      return c.json({ deliveries: await deliveries.history(50) })
    })
    .post(
      '/campaigns/:id/deliveries/recover',
      jsonBody(recoverDeliverySchema),
      async (c) => {
        const repositories = c.get('repositories')
        const recover = createRecoverDeliveryUseCase({
          campaigns: repositories.campaigns,
          deliveries: repositories.deliveries,
          connection: repositories.instagram,
          enqueue: async (event) => {
            await c.env.INSTAGRAM_EVENTS.send(event)
          },
        })
        const body = c.req.valid('json')
        try {
          return c.json(
            await recover(c.req.param('id'), body.commentId, body.text),
            202,
          )
        } catch (error) {
          throw recoverDeliveryError(error) ?? error
        }
      },
    )
    .post(
      '/campaigns/:id/public-replies/backfill',
      jsonBody(expectedCountSchema),
      async (c) => {
        const body = c.req.valid('json')
        try {
          return c.json(
            await c
              .get('services')
              .publicReplies.run(c.req.param('id'), body.expectedCount, false),
          )
        } catch (error) {
          throw publicReplyError(error) ?? error
        }
      },
    )
    .post(
      '/campaigns/:id/public-replies/retry-failed',
      jsonBody(expectedCountSchema),
      async (c) => {
        const body = c.req.valid('json')
        try {
          return c.json(
            await c
              .get('services')
              .publicReplies.run(c.req.param('id'), body.expectedCount, true),
          )
        } catch (error) {
          throw publicReplyError(error) ?? error
        }
      },
    )
}
