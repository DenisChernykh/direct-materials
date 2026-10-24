const encoder = new TextEncoder()
const decoder = new TextDecoder()

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function hmacHex(secret: string, value: string): Promise<string> {
  const signature = await crypto.subtle.sign('HMAC', await importHmacKey(secret), encoder.encode(value))
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let mismatch = 0
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return mismatch === 0
}

export async function encryptToken(
  token: string,
  encodedKey: string,
): Promise<{ ciphertext: string; iv: string }> {
  const keyBytes = fromBase64Url(encodedKey)
  if (keyBytes.byteLength !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must contain 32 bytes')
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(token))
  return { ciphertext: toBase64Url(new Uint8Array(ciphertext)), iv: toBase64Url(iv) }
}

export async function decryptToken(ciphertext: string, iv: string, encodedKey: string): Promise<string> {
  const keyBytes = fromBase64Url(encodedKey)
  if (keyBytes.byteLength !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must contain 32 bytes')
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt'])
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64Url(iv) },
    key,
    fromBase64Url(ciphertext),
  )
  return decoder.decode(plaintext)
}

export async function createSignedState(secret: string): Promise<string> {
  const payload = `${Date.now()}.${crypto.randomUUID()}`
  const signature = await crypto.subtle.sign('HMAC', await importHmacKey(secret), encoder.encode(payload))
  return `${toBase64Url(encoder.encode(payload))}.${toBase64Url(new Uint8Array(signature))}`
}

export async function verifySignedState(secret: string, state: string, maxAgeMs = 10 * 60_000): Promise<boolean> {
  const [encodedPayload, encodedSignature, extra] = state.split('.')
  if (!encodedPayload || !encodedSignature || extra) return false

  try {
    const payloadBytes = fromBase64Url(encodedPayload)
    const valid = await crypto.subtle.verify(
      'HMAC',
      await importHmacKey(secret),
      fromBase64Url(encodedSignature),
      payloadBytes,
    )
    if (!valid) return false
    const [timestamp] = decoder.decode(payloadBytes).split('.')
    const createdAt = Number(timestamp)
    return Number.isFinite(createdAt) && Date.now() - createdAt >= 0 && Date.now() - createdAt <= maxAgeMs
  } catch {
    return false
  }
}
