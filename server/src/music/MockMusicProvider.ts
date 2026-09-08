import type { MusicImportResult, MusicProvider } from './types.js'
import { dedupeTracks } from './types.js'
import { SEED_TRACKS } from './seedTracks.js'

export class MockMusicProvider implements MusicProvider {
  async importFromUrl(_url: string): Promise<MusicImportResult> {
    throw new Error('Paste a Spotify link or leave empty to use the demo playlist.')
  }

  async loadDemoTracks(): Promise<MusicImportResult> {
    return {
      name: 'Demo Playlist',
      tracks: dedupeTracks(SEED_TRACKS.map((track) => ({ ...track }))),
      skippedCount: 0,
      source: 'mock',
    }
  }
}

export const mockMusicProvider = new MockMusicProvider()
