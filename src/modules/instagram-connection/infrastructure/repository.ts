import { getConnection, saveConnection } from '../../../infrastructure/db'
import { decryptToken } from '../../../security/crypto'
import type {
  InstagramConnection,
  InstagramConnectionInput,
  InstagramMedia,
} from '../application'
import { toIsoTimestamp } from '../../../infrastructure/time'

function mapConnection(
  row: Awaited<ReturnType<typeof getConnection>>,
): InstagramConnection | null {
  if (!row) return null
  return {
    accountId: row.account_id,
    username: row.username,
    status: row.status,
    webhookSubscribed: row.webhook_subscribed === 1,
    tokenExpiresAt: toIsoTimestamp(row.token_expires_at),
    createdAt: toIsoTimestamp(row.created_at),
    updatedAt: toIsoTimestamp(row.updated_at),
  }
}

export function createInstagramConnectionRepository(
  db: D1Database,
  mediaReader: () => Promise<InstagramMedia[]>,
) {
  return {
    get: async () => mapConnection(await getConnection(db)),
    getConnectedToken: async (encryptionKey: string) => {
      const row = await getConnection(db)
      if (!row || row.status !== 'connected' || row.webhook_subscribed !== 1)
        return null
      try {
        return {
          accountId: row.account_id,
          token: await decryptToken(
            row.token_ciphertext,
            row.token_iv,
            encryptionKey,
          ),
        }
      } catch {
        return null
      }
    },
    listMedia: mediaReader,
    save: (input: InstagramConnectionInput) => saveConnection(db, input),
  }
}
