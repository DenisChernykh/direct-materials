import { describe, expect, it } from 'vitest'
import {
  actionPayload,
  followerDecision,
  parseActionPayload,
} from '../src/modules/deliveries/application/process-event'

describe('delivery follower gate', () => {
  it('delivers only for an explicit true result', () => {
    expect(followerDecision(true)).toBe('deliver')
    expect(followerDecision(false)).toBe('request_follow')
    expect(followerDecision(null)).toBe('unavailable')
    expect(followerDecision(undefined)).toBe('unavailable')
  })

  it('uses an application-specific action payload', () => {
    const payload = actionPayload('delivery-id', 'recheck')
    expect(payload).toBe('material-delivery:delivery-id:recheck')
    expect(parseActionPayload(payload)).toEqual({ deliveryId: 'delivery-id', action: 'recheck' })
    expect(parseActionPayload('unrelated:delivery-id:recheck')).toBeNull()
  })
})
