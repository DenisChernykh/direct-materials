import { describe, expect, it } from 'vitest'
import { campaignMediaKey, nextMediaAfter } from '../src/campaigns/trigger'

describe('campaign trigger modes', () => {
  it('keeps a real media ID only for a specific publication', () => {
    expect(campaignMediaKey('campaign-1', 'specific', ' media-1 ')).toBe('media-1')
    expect(campaignMediaKey('campaign-1', 'any', '')).toBe('trigger:any:campaign-1')
    expect(campaignMediaKey('campaign-1', 'next', '')).toBe('trigger:next:campaign-1')
  })

  it('selects the earliest publication after activation regardless of API order', () => {
    expect(
      nextMediaAfter(
        [
          { id: 'media-later', timestamp: '2026-08-26T10:20:00Z' },
          { id: 'media-before', timestamp: '2026-08-26T09:55:00Z' },
          { id: 'media-next', timestamp: '2026-08-26T10:05:00Z' },
        ],
        '2026-08-26T10:00:00.000Z',
      ),
    ).toEqual({ id: 'media-next', timestamp: '2026-08-26T10:05:00Z' })
  })

  it('does not bind without a valid activation moment or a newer publication', () => {
    const media = [{ id: 'media-1', timestamp: '2026-08-26T10:00:00Z' }]
    expect(nextMediaAfter(media, null)).toBeNull()
    expect(nextMediaAfter(media, 'invalid')).toBeNull()
    expect(nextMediaAfter(media, '2026-08-26T10:00:00Z')).toBeNull()
  })
})
