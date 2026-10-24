import { describe, expect, it } from 'vitest'
import { publicReplyForComment } from '../src/campaigns/public-reply'

describe('public comment reply selection', () => {
  it('returns a stable campaign variant for the same comment', () => {
    const variants = ['Отправила в Direct 💌', 'Готово — проверь сообщения 🙌']

    const selected = publicReplyForComment('comment-123', variants)

    expect(selected).toBeTruthy()
    expect(publicReplyForComment('comment-123', variants)).toBe(selected)
    expect(variants).toContain(selected)
  })

  it('ignores blank variants and returns null for an empty list', () => {
    expect(publicReplyForComment('comment-1', [' ', '\n'])).toBeNull()
  })
})
