import { describe, expect, it } from 'vitest'
import {
  createAdminSession,
  secureTextEqual,
  verifyAdminSession,
} from '../src/security/admin-session'

const secret = 'owner-session-secret-with-enough-entropy'
const now = Date.UTC(2026, 7, 26, 10, 0, 0)

describe('admin session', () => {
  it('accepts a signed session during its lifetime', async () => {
    const session = await createAdminSession(secret, now)

    await expect(verifyAdminSession(secret, session, now + 60_000)).resolves.toBe(true)
  })

  it('rejects tampered and expired sessions', async () => {
    const session = await createAdminSession(secret, now)
    const tampered = `${session.slice(0, -1)}${session.endsWith('a') ? 'b' : 'a'}`

    await expect(verifyAdminSession(secret, tampered, now + 60_000)).resolves.toBe(false)
    await expect(verifyAdminSession(secret, session, now + 12 * 60 * 60_000)).resolves.toBe(false)
  })

  it('compares the owner password without exposing it', async () => {
    await expect(secureTextEqual('correct password', 'correct password')).resolves.toBe(true)
    await expect(secureTextEqual('correct password', 'wrong password')).resolves.toBe(false)
  })
})
