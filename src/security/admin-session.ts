import { constantTimeEqual, hmacHex } from './crypto'

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const sessionLifetimeMs = 12 * 60 * 60_000

function toBase64Url(value: string): string {
  let binary = ''
  for (const byte of encoder.encode(value)) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(padded)
  return decoder.decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)))
}

export async function secureTextEqual(left: string, right: string): Promise<boolean> {
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ])
  const leftHex = [...new Uint8Array(leftHash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  const rightHex = [...new Uint8Array(rightHash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return constantTimeEqual(leftHex, rightHex)
}

export async function createAdminSession(secret: string, now = Date.now()): Promise<string> {
  const payload = toBase64Url(`${now}.${now + sessionLifetimeMs}.${crypto.randomUUID()}`)
  return `${payload}.${await hmacHex(secret, payload)}`
}

export async function verifyAdminSession(
  secret: string,
  session: string | undefined,
  now = Date.now(),
): Promise<boolean> {
  if (!session) return false
  const [payload, signature, extra] = session.split('.')
  if (!payload || !signature || extra) return false

  try {
    if (!constantTimeEqual(signature, await hmacHex(secret, payload))) return false
    const [issuedAtValue, expiresAtValue, nonce, payloadExtra] = fromBase64Url(payload).split('.')
    const issuedAt = Number(issuedAtValue)
    const expiresAt = Number(expiresAtValue)
    return Boolean(
      nonce &&
      !payloadExtra &&
      Number.isFinite(issuedAt) &&
      Number.isFinite(expiresAt) &&
      issuedAt <= now &&
      expiresAt > now &&
      expiresAt - issuedAt === sessionLifetimeMs,
    )
  } catch {
    return false
  }
}
