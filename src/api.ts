import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { secureHeaders } from 'hono/secure-headers'
import { createRepositories } from './composition/repositories'
import { createServices } from './composition/services'
import { createSessionRoutes } from './modules/admin-auth/presentation/routes'
import { createCampaignRoutes } from './modules/campaigns/presentation/routes'
import { createDeliveryRoutes } from './modules/deliveries/presentation/routes'
import { createInstagramConnectionRoutes } from './modules/instagram-connection/presentation/routes'
import type { AppContext } from './shared/app-context'
import { ApiError, apiErrorBody } from './shared/api-error'
import { requireAdmin } from './shared/http'

function isWorkerOwnedPath(pathname: string): boolean {
  return ['/api', '/oauth', '/webhooks', '/health'].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

const adminRoutes = new Hono<AppContext>()
  .use('/dashboard', requireAdmin)
  .use('/media', requireAdmin)
  .use('/history', requireAdmin)
  .use('/campaigns', requireAdmin)
  .use('/campaigns/:id', requireAdmin)
  .use('/campaigns/:id/status', requireAdmin)
  .use('/campaigns/:id/public-replies/backfill', requireAdmin)
  .use('/campaigns/:id/public-replies/retry-failed', requireAdmin)
  .use('/campaigns/:id/deliveries/recover', requireAdmin)
  .route('/', createCampaignRoutes())
  .route('/', createDeliveryRoutes())

export const app = new Hono<AppContext>()
  .use('*', secureHeaders())
  .use('*', async (c, next) => {
    c.set('repositories', createRepositories(c.env))
    c.set('services', createServices(c.env))
    await next()
  })
  .get('/health', (c) =>
    c.json({ status: 'ok', service: 'instagram-material-delivery' }),
  )
  .route('/api/admin/session', createSessionRoutes())
  .route('/api/admin', adminRoutes)
  .route('/', createInstagramConnectionRoutes())
  .notFound(async (c) => {
    if (isWorkerOwnedPath(new URL(c.req.url).pathname))
      return c.json(
        apiErrorBody(new ApiError('NOT_FOUND', 'Маршрут не найден.', 404)),
        404,
      )
    if (c.env.ASSETS) {
      const assetResponse = await c.env.ASSETS.fetch(c.req.raw)
      // Asset fetchers may return immutable headers; clone before secureHeaders.
      return new Response(assetResponse.body, assetResponse)
    }
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Страница не найдена.' } },
      404,
    )
  })
  .onError((error, c) => {
    if (error instanceof ApiError)
      return c.json(apiErrorBody(error), error.status)
    if (error instanceof HTTPException && error.status === 400)
      return c.json(
        apiErrorBody(
          new ApiError('VALIDATION_FAILED', 'Некорректные данные.', 400),
        ),
        400,
      )
    if (error instanceof HTTPException) return error.getResponse()
    console.error(
      JSON.stringify({
        event: 'request_failed',
        path: new URL(c.req.url).pathname,
        errorCode: error.name,
      }),
    )
    return c.json(
      apiErrorBody(
        new ApiError('INTERNAL_ERROR', 'Внутренняя ошибка сервиса.', 500),
      ),
      500,
    )
  })

export type AppType = typeof app
export default app
