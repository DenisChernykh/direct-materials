import type { Context, Next } from 'hono'
import { zValidator } from '@hono/zod-validator'
import type { z } from 'zod'
import type { AppContext } from './app-context'
import { ApiError } from './api-error'

export const adminCookieName = 'direct_materials_admin'

export function adminCookie(session: string, maxAge = 12 * 60 * 60): string {
  return `${adminCookieName}=${session}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`
}

export function requestOrigin(c: Context<AppContext>): string {
  return new URL(c.req.url).origin
}

export function hasSameOrigin(c: Context<AppContext>): boolean {
  if (c.req.header('Origin') !== requestOrigin(c)) return false
  return c.req.header('Sec-Fetch-Site') === 'same-origin'
}

export async function requireAdmin(
  c: Context<AppContext>,
  next: Next,
): Promise<Response | void> {
  const session = await c
    .get('services')
    .adminAuth.getSession(c.req.raw.headers)
  if (!session.authenticated)
    throw new ApiError('AUTHENTICATION_REQUIRED', 'Требуется авторизация.', 401)
  c.set('adminEmail', session.email ?? c.get('services').adminAuth.email)
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD' && !hasSameOrigin(c)) {
    throw new ApiError(
      'AUTHENTICATION_REQUIRED',
      'Источник запроса не подтверждён.',
      401,
    )
  }
  await next()
}

export function jsonBody<T>(schema: z.ZodType<T>) {
  return zValidator('json', schema, (result) => {
    if (!result.success)
      throw new ApiError(
        'VALIDATION_FAILED',
        result.error.issues[0]?.message ?? 'Некорректные данные.',
        400,
      )
  })
}
