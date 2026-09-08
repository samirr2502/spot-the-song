import type { MusicImportResult } from './types.js'
import { mockMusicProvider } from './MockMusicProvider.js'
import { spotifyCatalogProvider } from './SpotifyCatalogProvider.js'

export async function resolveMusicImport(spotifyUrl?: string): Promise<MusicImportResult> {
  const trimmed = spotifyUrl?.trim()
  if (trimmed) {
    return spotifyCatalogProvider.importForRoom(trimmed)
  }

  return mockMusicProvider.loadDemoTracks()
}
