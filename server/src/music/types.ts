import type { Track } from '@spot-the-song/shared'

export type MusicImportResult = {
  name: string
  imageUrl?: string
  tracks: Track[]
  skippedCount: number
  source: 'spotify' | 'mock'
}

export type MusicPreviewResult = {
  name: string
  imageUrl?: string
  totalTracks: number
  playableCount: number
  skippedCount: number
  source: 'spotify' | 'mock'
  /** Deprecated preview URLs still resolved during import — not used for gameplay. */
  previewFallbackCount?: number
}

export interface MusicProvider {
  importFromUrl(url: string): Promise<MusicImportResult>
}

export function toPreviewResult(result: MusicImportResult): MusicPreviewResult {
  const spotifyTrackCount = countSpotifyTracks(result.tracks)
  const previewCount = result.tracks.filter((track) => track.previewUrl).length
  return {
    name: result.name,
    imageUrl: result.imageUrl,
    totalTracks: result.tracks.length,
    playableCount: spotifyTrackCount,
    skippedCount: result.skippedCount,
    source: result.source,
    previewFallbackCount: previewCount,
  }
}

export const MAX_TRACKS = 100
export const MIN_SPOTIFY_TRACKS = 1

function normalizeDedupeKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/^the\s+/, '')
    .replace(/[^\w\s']/g, '')
    .replace(/\s+/g, ' ')
}

function trackContentKey(track: Track): string {
  return `${normalizeDedupeKey(track.title)}|${normalizeDedupeKey(track.artist)}`
}

export function countSpotifyTracks(tracks: Track[]): number {
  return tracks.filter((track) => Boolean(track.spotifyUri)).length
}

/** @deprecated Use countSpotifyTracks — preview URLs are not gameplay-ready. */
export function countPlayableTracks(tracks: Track[]): number {
  return countSpotifyTracks(tracks)
}

export function dedupeTracks(tracks: Track[]): Track[] {
  const seenIds = new Set<string>()
  const seenContent = new Set<string>()
  const deduped: Track[] = []

  for (const track of tracks) {
    if (seenIds.has(track.id)) continue

    const contentKey = trackContentKey(track)
    if (seenContent.has(contentKey)) continue

    seenIds.add(track.id)
    seenContent.add(contentKey)
    deduped.push(track)
  }

  return deduped.slice(0, MAX_TRACKS)
}
