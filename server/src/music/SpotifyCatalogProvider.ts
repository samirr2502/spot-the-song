import type { Track } from '@spot-the-song/shared'
import type { MusicCatalogProvider } from '@spot-the-song/shared'
import { importSpotifyUrl, parseSpotifyUrl } from './spotifyImport.js'
import type { MusicImportResult } from './types.js'
import { dedupeTracks } from './types.js'

function mapParsedToTrack(entry: Awaited<ReturnType<typeof importSpotifyUrl>>['resolvedTracks'][number]): Track {
  return {
    id: `spotify_${entry.trackId}`,
    title: entry.title,
    artist: entry.artist,
    album: entry.album,
    year: entry.releaseYear,
    artworkUrl: entry.artworkUrl ?? null,
    spotifyUri: entry.spotifyUri,
    spotifyUrl: entry.spotifyUrl,
    durationMs: entry.durationMs,
    previewUrl: entry.previewUrl ?? undefined,
  }
}

export class SpotifyCatalogProvider implements MusicCatalogProvider {
  async getTracksFromPlaylist(url: string): Promise<Track[]> {
    const resource = parseSpotifyUrl(url)
    if (!resource || resource.type !== 'playlist') {
      throw new Error('Paste a Spotify playlist link.')
    }
    return this.importUrl(url)
  }

  async getTracksFromAlbum(url: string): Promise<Track[]> {
    const resource = parseSpotifyUrl(url)
    if (!resource || resource.type !== 'album') {
      throw new Error('Paste a Spotify album link.')
    }
    return this.importUrl(url)
  }

  async importUrl(url: string): Promise<Track[]> {
    const source = await importSpotifyUrl(url)
    return dedupeTracks(source.resolvedTracks.map(mapParsedToTrack))
  }

  async importForRoom(url: string): Promise<MusicImportResult> {
    const source = await importSpotifyUrl(url)
    const tracks = dedupeTracks(source.resolvedTracks.map(mapParsedToTrack))

    if (tracks.length === 0) {
      throw new Error('No tracks found in this Spotify link.')
    }

    const missingUri = tracks.filter((track) => !track.spotifyUri).length

    return {
      name: source.name,
      imageUrl: source.imageUrl ?? undefined,
      tracks,
      skippedCount: missingUri,
      source: 'spotify',
    }
  }
}

export const spotifyCatalogProvider = new SpotifyCatalogProvider()

/** @deprecated Use spotifyCatalogProvider */
export const spotifyProvider = {
  importFromUrl: (url: string) => spotifyCatalogProvider.importForRoom(url),
}
