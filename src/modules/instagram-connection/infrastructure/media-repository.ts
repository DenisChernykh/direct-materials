import type { Env } from '../../../env'
import { getConnection } from '../../../infrastructure/db'
import { decryptToken } from '../../../security/crypto'
import { listMedia } from '../../../instagram/api'
import { toIsoTimestamp } from '../../../infrastructure/time'

export async function listAvailableMedia(env: Env) {
  const connection = await getConnection(env.DB)
  if (!connection || connection.status !== 'connected') return []
  try {
    const token = await decryptToken(
      connection.token_ciphertext,
      connection.token_iv,
      env.TOKEN_ENCRYPTION_KEY,
    )
    const result = await listMedia(token)
    return result.ok
      ? result.value.map((item) => ({
          id: item.id,
          caption: item.caption ?? null,
          mediaType: item.media_type ?? null,
          timestamp: toIsoTimestamp(item.timestamp),
          permalink: item.permalink ?? null,
        }))
      : []
  } catch {
    return []
  }
}
