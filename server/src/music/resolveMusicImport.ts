import type { MusicImportResult } from './types.js'
import { mockMusicProvider } from './MockMusicProvider.js'
import { spotifyProvider } from './SpotifyProvider.js'

export async function resolveMusicImport(spotifyUrl?: string): Promise<MusicImportResult> {
  const trimmed = spotifyUrl?.trim()
  if (trimmed) {
    return spotifyProvider.importFromUrl(trimmed)
  }

  return mockMusicProvider.loadDemoTracks()
}
