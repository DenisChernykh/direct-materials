export type MatchMode = 'contains' | 'exact'

const punctuationAtEdges = /^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu
const dashWithOptionalWhitespace = /\s*[-‐‑‒–—―−]\s*/gu

export function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('ru-RU')
    .replace(dashWithOptionalWhitespace, '-')
    .replace(/\s+/gu, ' ')
    .replace(punctuationAtEdges, '')
    .trim()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function matchesKeyword(comment: string, keyword: string, mode: MatchMode): boolean {
  const normalizedComment = normalizeText(comment)
  const normalizedKeyword = normalizeText(keyword)

  if (!normalizedComment || !normalizedKeyword) return false
  if (mode === 'exact') return normalizedComment === normalizedKeyword

  const pattern = new RegExp(
    `(?:^|[\\p{P}\\p{S}\\s])${escapeRegExp(normalizedKeyword)}(?:$|[\\p{P}\\p{S}\\s])`,
    'u',
  )
  return pattern.test(normalizedComment)
}

export function matchesAnyKeyword(
  comment: string,
  keywords: string[],
  mode: MatchMode,
): boolean {
  return keywords.some((keyword) => matchesKeyword(comment, keyword, mode))
}
