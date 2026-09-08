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
}

export interface MusicProvider {
  importFromUrl(url: string): Promise<MusicImportResult>
}

export function toPreviewResult(result: MusicImportResult): MusicPreviewResult {
  const playableCount = result.tracks.filter((track) => track.previewUrl).length
  return {
    name: result.name,
    imageUrl: result.imageUrl,
    totalTracks: result.tracks.length,
    playableCount,
    skippedCount: result.skippedCount,
    source: result.source,
  }
}

export const MAX_TRACKS = 100

export function dedupeTracks(tracks: Track[]): Track[] {
  const seen = new Set<string>()
  const deduped: Track[] = []

  for (const track of tracks) {
    if (seen.has(track.id)) continue
    seen.add(track.id)
    deduped.push(track)
  }

  return deduped.slice(0, MAX_TRACKS)
}
