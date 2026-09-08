import type { GuessFieldKey } from '@spot-the-song/shared'

const FIELD_LABELS: Record<GuessFieldKey, string> = {
  title: 'Title',
  artist: 'Artist',
  album: 'Album',
  year: 'Year',
}

/** Score row label: player's guess when available, never the revealed answer. */
export function formatFieldScoreLabel(
  field: GuessFieldKey,
  correct?: boolean,
  playerAnswer?: string,
): string {
  const check = correct ? ' ✓' : ''
  const trimmed = playerAnswer?.trim()
  if (trimmed) {
    return `${FIELD_LABELS[field]}: ${trimmed}${check}`
  }
  return `${FIELD_LABELS[field]}${check}`
}
