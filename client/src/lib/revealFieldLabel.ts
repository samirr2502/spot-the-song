import type { GuessFieldKey, RevealTrack } from '@spot-the-song/shared'

const FIELD_LABELS: Record<GuessFieldKey, string> = {
  title: 'Title',
  artist: 'Artist',
  album: 'Album',
  year: 'Year',
}

export function revealFieldValue(field: GuessFieldKey, track: RevealTrack): string {
  if (field === 'year') {
    return track.year != null ? String(track.year) : '—'
  }
  return track[field]
}

export function formatFieldScoreLabel(
  field: GuessFieldKey,
  track: RevealTrack,
  correct?: boolean,
): string {
  const check = correct ? ' ✓' : ''
  return `${FIELD_LABELS[field]}: ${revealFieldValue(field, track)}${check}`
}
