import { describe, expect, it } from 'vitest'
import { matchesKeyword, normalizeText } from '../src/campaigns/matching'

describe('keyword matching', () => {
  it.each([
    ['Курс', true],
    ['КУРС!', true],
    ['Хочу курс', true],
    ['Хочу   КУРС!!!', true],
    ['экскурсия', false],
    ['курсовая', false],
  ])('matches "%s" by whole word', (comment, expected) => {
    expect(matchesKeyword(comment, 'курс', 'contains')).toBe(expected)
  })

  it('requires the complete normalized comment in exact mode', () => {
    expect(matchesKeyword('  КУРС!  ', 'курс', 'exact')).toBe(true)
    expect(matchesKeyword('хочу курс', 'курс', 'exact')).toBe(false)
  })

  it('normalizes Unicode compatibility forms and whitespace', () => {
    expect(normalizeText('  ＧＡＩＤ\n   Гайд! ')).toBe('gaid гайд')
  })

  it.each(['Блог-тур', 'Блог - тур', 'Блог – тур', 'Блог — тур'])(
    'treats dash variants and surrounding whitespace equally in "%s"',
    (comment) => {
      expect(normalizeText(comment)).toBe('блог-тур')
      expect(matchesKeyword(comment, 'блог-тур', 'contains')).toBe(true)
    },
  )
})
