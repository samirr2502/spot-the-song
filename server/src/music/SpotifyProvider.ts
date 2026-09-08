import type { Track } from '@spot-the-song/shared'
import { importSpotifyUrl } from './spotifyImport.js'
import type { MusicImportResult, MusicProvider } from './types.js'
import { dedupeTracks } from './types.js'

export class SpotifyProvider implements MusicProvider {
  async importFromUrl(url: string): Promise<MusicImportResult> {
    const source = await importSpotifyUrl(url)

    let skippedCount = 0
    const tracks: Track[] = source.resolvedTracks.map((entry) => {
      if (!entry.previewUrl) {
        skippedCount += 1
      }

      return {
        id: `spotify_${entry.trackId}`,
        title: entry.title,
        artist: entry.artist,
        album: entry.album,
        year: entry.releaseYear ?? 2000,
        artworkUrl: source.imageUrl ?? undefined,
        previewUrl: entry.previewUrl ?? undefined,
      }
    })

    const deduped = dedupeTracks(tracks)

    if (deduped.length === 0) {
      throw new Error('No tracks found in this Spotify link.')
    }

    return {
      name: source.name,
      imageUrl: source.imageUrl ?? undefined,
      tracks: deduped,
      skippedCount,
      source: 'spotify',
    }
  }
}

export const spotifyProvider = new SpotifyProvider()
