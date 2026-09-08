import type { Track } from '../types/track.js'

export interface MusicCatalogProvider {
  getTracksFromPlaylist(url: string): Promise<Track[]>
  getTracksFromAlbum(url: string): Promise<Track[]>
}
