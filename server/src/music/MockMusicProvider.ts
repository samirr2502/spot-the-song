import type { Track } from '@spot-the-song/shared'
import type { MusicProvider } from './MusicProvider.js'
import { SEED_TRACKS } from './seedTracks.js'

export class MockMusicProvider implements MusicProvider {
  async loadTracks(): Promise<Track[]> {
    return SEED_TRACKS.map((track) => ({ ...track }))
  }
}

export const mockMusicProvider = new MockMusicProvider()
