import type { Track } from '@spot-the-song/shared'

export type MusicProvider = {
  loadTracks(): Promise<Track[]>
}
