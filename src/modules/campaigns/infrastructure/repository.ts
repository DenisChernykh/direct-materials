import {
  deliveryCounters,
  getCampaign,
  getConflictingActiveTriggerCampaign,
  listCampaigns,
  saveCampaign,
  setCampaignStatus,
} from '../../../infrastructure/db'
import type {
  CampaignMutation,
  Campaign,
  CampaignStatus,
  CampaignTriggerMode,
} from '../application'
import type { CampaignWithKeywords as CampaignRow } from '../../../infrastructure/db'
import { toIsoTimestamp } from '../../../infrastructure/time'

function mapCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    name: row.name,
    mediaId: row.trigger_mode === 'specific' ? row.media_id : '',
    mediaPermalink: row.media_permalink,
    triggerMode: row.trigger_mode,
    armedAt: toIsoTimestamp(row.armed_at),
    matchMode: row.match_mode,
    keywords: row.keywords,
    initialMessage: row.initial_message,
    initialButtonText: row.initial_button_text,
    followMessage: row.follow_message,
    recheckButtonText: row.recheck_button_text,
    deliveryMessage: row.delivery_message,
    unavailableMessage: row.unavailable_message,
    materialUrl: row.material_url,
    publicReplyEnabled: row.public_reply_enabled === 1,
    publicReplyVariants: row.public_reply_variants,
    status: row.status,
    revision: row.revision,
    createdAt: toIsoTimestamp(row.created_at),
    updatedAt: toIsoTimestamp(row.updated_at),
  }
}

export function createCampaignRepository(db: D1Database) {
  return {
    list: async () =>
      (await listCampaigns(db)).map((row) =>
        mapCampaign({ ...row, keywords: [], public_reply_variants: [] }),
      ),
    get: async (id: string) => {
      const row = await getCampaign(db, id)
      return row ? mapCampaign(row) : null
    },
    save: (input: CampaignMutation) =>
      saveCampaign(db, {
        ...input,
        mediaPermalink: input.mediaPermalink ?? undefined,
      }),
    setStatus: (id: string, status: CampaignStatus) =>
      setCampaignStatus(db, id, status),
    findStatusConflict: async (id: string, mode: CampaignTriggerMode) => {
      const row = await getConflictingActiveTriggerCampaign(db, id, mode)
      if (!row) return null
      return mapCampaign({ ...row, keywords: [], public_reply_variants: [] })
    },
    counters: () => deliveryCounters(db),
  }
}
