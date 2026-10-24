import { describe, expect, it } from 'vitest'
import { createAdminAuthService } from '../src/modules/admin-auth/application'

describe('admin auth application', () => {
  it('accepts only the configured Cloudflare Access email', async () => {
    const service = createAdminAuthService({
      email: 'owner@example.com',
      password: 'secret',
      sessionKey: 'session-key',
    })
    const wrongEmail = new Headers({
      'Cf-Access-Authenticated-User-Email': 'attacker@example.com',
    })
    const ownerEmail = new Headers({
      'Cf-Access-Authenticated-User-Email': 'OWNER@example.com',
    })

    await expect(service.getSession(wrongEmail)).resolves.toEqual({
      authenticated: false,
      email: null,
    })
    await expect(service.getSession(ownerEmail)).resolves.toEqual({
      authenticated: true,
      email: 'owner@example.com',
    })
  })
})
