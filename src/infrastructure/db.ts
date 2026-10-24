import type { MatchMode } from '../campaigns/matching'
import { normalizeText } from '../campaigns/matching'
import type { CampaignTriggerMode } from '../campaigns/trigger'
import { campaignMediaKey } from '../campaigns/trigger'
import { publicReplyForComment } from '../campaigns/public-reply'

export type ConnectionStatus = 'connected' | 'action_required' | 'disconnected'
export type CampaignStatus = 'draft' | 'active' | 'paused'
export type DeliveryStatus =
  | 'received'
  | 'initial_dm_sent'
  | 'waiting_for_follow'
  | 'delivered'
  | 'failed'
  | 'unknown'
export type PublicReplyStatus = 'disabled' | 'pending' | 'sent' | 'failed' | 'unknown'

export interface InstagramConnection {
  singleton_id: number
  account_id: string
  username: string
  token_ciphertext: string
  token_iv: string
  token_expires_at: string | null
  permissions_json: string
  status: ConnectionStatus
  webhook_subscribed: number
  created_at: string
  updated_at: string
}

export interface Campaign {
  id: string
  name: string
  media_id: string
  media_permalink: string | null
  trigger_mode: CampaignTriggerMode
  armed_at: string | null
  match_mode: MatchMode
  initial_message: string
  initial_button_text: string
  follow_message: string
  recheck_button_text: string
  delivery_message: string
  unavailable_message: string
  material_url: string
  public_reply_enabled: number
  public_reply_variants_json: string
  status: CampaignStatus
  revision: number
  created_at: string
  updated_at: string
}

export interface CampaignWithKeywords extends Campaign {
  keywords: string[]
  public_reply_variants: string[]
}

export interface Delivery {
  id: string
  campaign_id: string
  campaign_revision: number
  comment_id: string
  recipient_id: string | null
  last_action_event_id: string | null
  status: DeliveryStatus
  initial_message: string
  initial_button_text: string
  follow_message: string
  recheck_button_text: string
  delivery_message: string
  unavailable_message: string
  material_url: string
  public_reply_text: string | null
  public_reply_status: PublicReplyStatus
  public_reply_error_code: string | null
  error_code: string | null
  created_at: string
  updated_at: string
  delivered_at: string | null
}

export type CampaignInput = {
  id?: string
  name: string
  mediaId: string
  mediaPermalink?: string
  triggerMode: CampaignTriggerMode
  matchMode: MatchMode
  keywords: string[]
  initialMessage: string
  initialButtonText: string
  followMessage: string
  recheckButtonText: string
  deliveryMessage: string
  unavailableMessage: string
  materialUrl: string
  publicReplyEnabled: boolean
  publicReplyVariants: string[]
  status: CampaignStatus
}

export type DeliveryCampaignInput = {
  id: string
  revision: number
  initialMessage: string
  initialButtonText: string
  followMessage: string
  recheckButtonText: string
  deliveryMessage: string
  unavailableMessage: string
  materialUrl: string
  publicReplyEnabled: boolean
  publicReplyVariants: string[]
}

function publicReplyVariants(campaign: Campaign): string[] {
  try {
    const parsed: unknown = JSON.parse(campaign.public_reply_variants_json)
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : []
  } catch {
    return []
  }
}

function campaignWithKeywords(campaign: Campaign, keywords: string[]): CampaignWithKeywords {
  return { ...campaign, keywords, public_reply_variants: publicReplyVariants(campaign) }
}

export async function getConnection(db: D1Database): Promise<InstagramConnection | null> {
  return db.prepare('SELECT * FROM instagram_connection WHERE singleton_id = 1').first<InstagramConnection>()
}

export async function saveConnection(
  db: D1Database,
  connection: {
    accountId: string
    username: string
    tokenCiphertext: string
    tokenIv: string
    tokenExpiresAt: string | null
    permissions: string[]
    status: ConnectionStatus
    webhookSubscribed: boolean
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO instagram_connection (
        singleton_id, account_id, username, token_ciphertext, token_iv,
        token_expires_at, permissions_json, status, webhook_subscribed
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(singleton_id) DO UPDATE SET
        account_id = excluded.account_id,
        username = excluded.username,
        token_ciphertext = excluded.token_ciphertext,
        token_iv = excluded.token_iv,
        token_expires_at = excluded.token_expires_at,
        permissions_json = excluded.permissions_json,
        status = excluded.status,
        webhook_subscribed = excluded.webhook_subscribed,
        updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(
      connection.accountId,
      connection.username,
      connection.tokenCiphertext,
      connection.tokenIv,
      connection.tokenExpiresAt,
      JSON.stringify(connection.permissions),
      connection.status,
      connection.webhookSubscribed ? 1 : 0,
    )
    .run()
}

export async function listCampaigns(db: D1Database): Promise<Campaign[]> {
  const result = await db.prepare('SELECT * FROM campaigns ORDER BY updated_at DESC').all<Campaign>()
  return result.results
}

export async function getCampaign(db: D1Database, id: string): Promise<CampaignWithKeywords | null> {
  const campaign = await db.prepare('SELECT * FROM campaigns WHERE id = ?').bind(id).first<Campaign>()
  if (!campaign) return null
  const keywordResult = await db
    .prepare('SELECT value FROM campaign_keywords WHERE campaign_id = ? ORDER BY created_at, value')
    .bind(id)
    .all<{ value: string }>()
  return campaignWithKeywords(campaign, keywordResult.results.map((row) => row.value))
}

export async function getActiveCampaignByMedia(
  db: D1Database,
  mediaId: string,
): Promise<CampaignWithKeywords | null> {
  const campaign = await db
    .prepare(
      "SELECT * FROM campaigns WHERE media_id = ? AND trigger_mode = 'specific' AND status = 'active'",
    )
    .bind(mediaId)
    .first<Campaign>()
  if (!campaign) return null
  const keywordResult = await db
    .prepare('SELECT value FROM campaign_keywords WHERE campaign_id = ? ORDER BY created_at, value')
    .bind(campaign.id)
    .all<{ value: string }>()
  return campaignWithKeywords(campaign, keywordResult.results.map((row) => row.value))
}

export async function getActiveCampaignByTriggerMode(
  db: D1Database,
  triggerMode: 'any' | 'next',
): Promise<CampaignWithKeywords | null> {
  const campaign = await db
    .prepare('SELECT * FROM campaigns WHERE trigger_mode = ? AND status = \'active\' LIMIT 1')
    .bind(triggerMode)
    .first<Campaign>()
  if (!campaign) return null
  const keywordResult = await db
    .prepare('SELECT value FROM campaign_keywords WHERE campaign_id = ? ORDER BY created_at, value')
    .bind(campaign.id)
    .all<{ value: string }>()
  return campaignWithKeywords(campaign, keywordResult.results.map((row) => row.value))
}

export async function getConflictingActiveTriggerCampaign(
  db: D1Database,
  id: string,
  triggerMode: CampaignTriggerMode,
): Promise<Campaign | null> {
  if (triggerMode === 'specific') return null
  return db
    .prepare(
      'SELECT * FROM campaigns WHERE trigger_mode = ? AND status = \'active\' AND id <> ? LIMIT 1',
    )
    .bind(triggerMode, id)
    .first<Campaign>()
}

export async function saveCampaign(db: D1Database, input: CampaignInput): Promise<string> {
  const id = input.id ?? crypto.randomUUID()
  const mediaId = campaignMediaKey(id, input.triggerMode, input.mediaId)
  if (!mediaId) throw new Error('A specific publication ID is required')
  const normalizedKeywords = new Map<string, string>()
  for (const keyword of input.keywords) {
    const normalized = normalizeText(keyword)
    if (normalized) normalizedKeywords.set(normalized, keyword.trim())
  }
  if (normalizedKeywords.size === 0) throw new Error('At least one keyword is required')

  const campaignStatement = input.id
    ? db
        .prepare(
          `UPDATE campaigns SET
            name = ?, media_id = ?, media_permalink = ?, trigger_mode = ?,
            armed_at = CASE WHEN ? = 'next' THEN armed_at ELSE NULL END,
            match_mode = ?,
            initial_message = ?, initial_button_text = ?, follow_message = ?,
            recheck_button_text = ?, delivery_message = ?, unavailable_message = ?,
            material_url = ?, public_reply_enabled = ?, public_reply_variants_json = ?,
            status = ?, revision = revision + 1, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
        )
        .bind(
          input.name,
          mediaId,
          input.triggerMode === 'specific' ? input.mediaPermalink ?? null : null,
          input.triggerMode,
          input.triggerMode,
          input.matchMode,
          input.initialMessage,
          input.initialButtonText,
          input.followMessage,
          input.recheckButtonText,
          input.deliveryMessage,
          input.unavailableMessage,
          input.materialUrl,
          input.publicReplyEnabled ? 1 : 0,
          JSON.stringify(input.publicReplyVariants),
          input.status,
          id,
        )
    : db
        .prepare(
          `INSERT INTO campaigns (
            id, name, media_id, media_permalink, trigger_mode, armed_at, match_mode,
            initial_message, initial_button_text, follow_message, recheck_button_text,
            delivery_message, unavailable_message, material_url,
            public_reply_enabled, public_reply_variants_json, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          input.name,
          mediaId,
          input.triggerMode === 'specific' ? input.mediaPermalink ?? null : null,
          input.triggerMode,
          input.triggerMode === 'next' && input.status === 'active'
            ? new Date().toISOString()
            : null,
          input.matchMode,
          input.initialMessage,
          input.initialButtonText,
          input.followMessage,
          input.recheckButtonText,
          input.deliveryMessage,
          input.unavailableMessage,
          input.materialUrl,
          input.publicReplyEnabled ? 1 : 0,
          JSON.stringify(input.publicReplyVariants),
          input.status,
        )

  const statements = [campaignStatement]
  if (input.id) statements.push(db.prepare('DELETE FROM campaign_keywords WHERE campaign_id = ?').bind(id))
  for (const [normalized, value] of normalizedKeywords) {
    statements.push(
      db
        .prepare(
          'INSERT INTO campaign_keywords (id, campaign_id, value, normalized_value) VALUES (?, ?, ?, ?)',
        )
        .bind(crypto.randomUUID(), id, value, normalized),
    )
  }
  await db.batch(statements)
  return id
}

export async function setCampaignStatus(
  db: D1Database,
  id: string,
  status: CampaignStatus,
): Promise<void> {
  await db
    .prepare(
      `UPDATE campaigns SET
        status = ?,
        armed_at = CASE WHEN trigger_mode = 'next' AND ? = 'active' THEN ? ELSE NULL END,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(status, status, new Date().toISOString(), id)
    .run()
}

export async function bindNextCampaignToMedia(
  db: D1Database,
  id: string,
  media: { id: string; permalink?: string },
): Promise<CampaignWithKeywords | null> {
  const result = await db
    .prepare(
      `UPDATE campaigns SET
        trigger_mode = 'specific', media_id = ?, media_permalink = ?, armed_at = NULL,
        revision = revision + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND trigger_mode = 'next' AND status = 'active'`,
    )
    .bind(media.id, media.permalink ?? null, id)
    .run()
  if ((result.meta.changes ?? 0) !== 1) return null
  return getCampaign(db, id)
}

export async function createDelivery(
  db: D1Database,
  campaign: DeliveryCampaignInput,
  commentId: string,
): Promise<Delivery | null> {
  const id = crypto.randomUUID()
  const publicReplyText = campaign.publicReplyEnabled
    ? publicReplyForComment(commentId, campaign.publicReplyVariants)
    : null
  const result = await db
    .prepare(
      `INSERT OR IGNORE INTO deliveries (
        id, campaign_id, campaign_revision, comment_id, status,
        initial_message, initial_button_text, follow_message, recheck_button_text,
        delivery_message, unavailable_message, material_url,
        public_reply_text, public_reply_status
      ) VALUES (?, ?, ?, ?, 'received', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      campaign.id,
      campaign.revision,
      commentId,
      campaign.initialMessage,
      campaign.initialButtonText,
      campaign.followMessage,
      campaign.recheckButtonText,
      campaign.deliveryMessage,
      campaign.unavailableMessage,
      campaign.materialUrl,
      publicReplyText,
      publicReplyText ? 'pending' : 'disabled',
    )
    .run()
  if ((result.meta.changes ?? 0) === 0) return null
  return getDelivery(db, id)
}

export async function getDelivery(db: D1Database, id: string): Promise<Delivery | null> {
  return db.prepare('SELECT * FROM deliveries WHERE id = ?').bind(id).first<Delivery>()
}

export async function getDeliveryByCampaignComment(
  db: D1Database,
  campaignId: string,
  commentId: string,
): Promise<Delivery | null> {
  return db
    .prepare('SELECT * FROM deliveries WHERE campaign_id = ? AND comment_id = ?')
    .bind(campaignId, commentId)
    .first<Delivery>()
}

export async function claimDeliveryAction(
  db: D1Database,
  id: string,
  eventId: string,
  recipientId: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE deliveries SET
        last_action_event_id = ?, recipient_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND (last_action_event_id IS NULL OR last_action_event_id <> ?)`,
    )
    .bind(eventId, recipientId, id, eventId)
    .run()
  return (result.meta.changes ?? 0) === 1
}

export async function updateDelivery(
  db: D1Database,
  id: string,
  update: { status: DeliveryStatus; recipientId?: string; errorCode?: string | null },
): Promise<void> {
  await db
    .prepare(
      `UPDATE deliveries SET
        status = ?,
        recipient_id = COALESCE(?, recipient_id),
        error_code = ?,
        delivered_at = CASE WHEN ? = 'delivered' THEN CURRENT_TIMESTAMP ELSE delivered_at END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
    )
    .bind(update.status, update.recipientId ?? null, update.errorCode ?? null, update.status, id)
    .run()
}

export async function updatePublicReply(
  db: D1Database,
  id: string,
  update: { status: PublicReplyStatus; errorCode?: string | null },
): Promise<void> {
  await db
    .prepare(
      `UPDATE deliveries SET
        public_reply_status = ?, public_reply_error_code = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(update.status, update.errorCode ?? null, id)
    .run()
}

export async function listBackfillablePublicReplies(
  db: D1Database,
  campaignId: string,
  limit = 20,
): Promise<Delivery[]> {
  const result = await db
    .prepare(
      `SELECT * FROM deliveries
       WHERE campaign_id = ?
         AND public_reply_status = 'disabled'
         AND status IN ('initial_dm_sent', 'waiting_for_follow', 'delivered')
         AND created_at >= datetime('now', '-7 days')
       ORDER BY created_at ASC
       LIMIT ?`,
    )
    .bind(campaignId, Math.min(Math.max(limit, 1), 20))
    .all<Delivery>()
  return result.results
}

export async function claimPublicReply(
  db: D1Database,
  id: string,
  text: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE deliveries SET
        public_reply_text = ?, public_reply_status = 'pending',
        public_reply_error_code = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND public_reply_status = 'disabled'`,
    )
    .bind(text, id)
    .run()
  return (result.meta.changes ?? 0) === 1
}

export async function listFailedPublicReplies(
  db: D1Database,
  campaignId: string,
  limit = 20,
): Promise<Delivery[]> {
  const result = await db
    .prepare(
      `SELECT * FROM deliveries
       WHERE campaign_id = ?
         AND public_reply_status = 'failed'
         AND status IN ('initial_dm_sent', 'waiting_for_follow', 'delivered')
         AND created_at >= datetime('now', '-7 days')
       ORDER BY updated_at ASC
       LIMIT ?`,
    )
    .bind(campaignId, Math.min(Math.max(limit, 1), 20))
    .all<Delivery>()
  return result.results
}

export async function claimFailedPublicReply(
  db: D1Database,
  id: string,
  previousText: string | null,
  retryText: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE deliveries SET
        public_reply_text = ?, public_reply_status = 'pending',
        public_reply_error_code = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
         AND public_reply_status = 'failed'
         AND COALESCE(public_reply_text, '') = COALESCE(?, '')`,
    )
    .bind(retryText, id, previousText)
    .run()
  return (result.meta.changes ?? 0) === 1
}

export async function listRecentDeliveries(db: D1Database, limit = 50): Promise<Array<Delivery & { campaign_name: string }>> {
  const result = await db
    .prepare(
      `SELECT deliveries.*, campaigns.name AS campaign_name
       FROM deliveries JOIN campaigns ON campaigns.id = deliveries.campaign_id
       ORDER BY deliveries.created_at DESC LIMIT ?`,
    )
    .bind(Math.min(Math.max(limit, 1), 100))
    .all<Delivery & { campaign_name: string }>()
  return result.results
}

export async function deliveryCounters(db: D1Database): Promise<Record<string, number>> {
  const result = await db
    .prepare('SELECT status, COUNT(*) AS count FROM deliveries GROUP BY status')
    .all<{ status: string; count: number }>()
  return Object.fromEntries(result.results.map((row) => [row.status, row.count]))
}

export async function deleteOldDeliveries(db: D1Database): Promise<number> {
  const result = await db
    .prepare("DELETE FROM deliveries WHERE created_at < datetime('now', '-30 days')")
    .run()
  return result.meta.changes ?? 0
}
