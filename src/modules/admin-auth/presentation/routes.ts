import { Hono } from 'hono'
import type { AppContext } from '../../../shared/app-context'
import { ApiError } from '../../../shared/api-error'
import {
  adminCookie,
  hasSameOrigin,
  jsonBody,
  requireAdmin,
} from '../../../shared/http'
import { z } from 'zod'

const loginSchema = z.strictObject({ password: z.string().min(1) })

export function createSessionRoutes() {
  return new Hono<AppContext>()
    .get('/', async (c) => {
      return c.json(
        await c.get('services').adminAuth.getSession(c.req.raw.headers),
      )
    })
    .post('/', jsonBody(loginSchema), async (c) => {
      if (!hasSameOrigin(c))
        throw new ApiError(
          'AUTHENTICATION_REQUIRED',
          'Источник запроса не подтверждён.',
          401,
        )
      const body = c.req.valid('json')
      if (!(await c.get('services').adminAuth.verifyPassword(body.password)))
        throw new ApiError('INVALID_CREDENTIALS', 'Неверный пароль.', 401)
      c.header(
        'Set-Cookie',
        adminCookie(await c.get('services').adminAuth.createSession()),
      )
      return c.json({
        authenticated: true,
        email: c.get('services').adminAuth.email,
      })
    })
    .delete('/', async (c) => {
      if (!hasSameOrigin(c))
        throw new ApiError(
          'AUTHENTICATION_REQUIRED',
          'Источник запроса не подтверждён.',
          401,
        )
      c.header('Set-Cookie', adminCookie('', 0))
      return c.body(null, 204)
    })
}

export { requireAdmin }
