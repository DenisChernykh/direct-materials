/**
 * D1's CURRENT_TIMESTAMP is UTC, but SQLite returns it without the `T`/`Z`
 * markers required by the application contract. Normalize every persisted
 * timestamp while crossing the storage boundary.
 */
export function toIsoTimestamp(value: string): string
export function toIsoTimestamp(value: string | null | undefined): string | null
export function toIsoTimestamp(
  value: string | null | undefined,
): string | null {
  if (!value) return null
  const withTimezone =
    value.endsWith('Z') || /[+-]\d{2}:?\d{2}$/u.test(value)
      ? value
      : `${value.replace(' ', 'T')}Z`
  const parsed = new Date(withTimezone)
  if (Number.isNaN(parsed.valueOf()))
    throw new Error('Invalid persisted timestamp')
  return parsed.toISOString()
}
