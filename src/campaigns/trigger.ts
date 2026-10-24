export type CampaignTriggerMode = 'specific' | 'any' | 'next'

export type TriggerMedia = {
  id: string
  timestamp?: string
  permalink?: string
}

export function campaignMediaKey(
  campaignId: string,
  triggerMode: CampaignTriggerMode,
  mediaId: string,
): string {
  if (triggerMode === 'specific') return mediaId.trim()
  return `trigger:${triggerMode}:${campaignId}`
}

export function nextMediaAfter(
  media: TriggerMedia[],
  armedAt: string | null,
): TriggerMedia | null {
  if (!armedAt) return null
  const armedAtMs = Date.parse(armedAt)
  if (!Number.isFinite(armedAtMs)) return null

  return media
    .filter((item) => item.timestamp && Date.parse(item.timestamp) > armedAtMs)
    .sort((left, right) => {
      const timeDifference = Date.parse(left.timestamp!) - Date.parse(right.timestamp!)
      return timeDifference || left.id.localeCompare(right.id)
    })[0] ?? null
}
