import type { Album, Song } from '@spot-the-song/game-engine'
import { createId } from '@spot-the-song/game-engine'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './supabase'

export type SpotifyImportResult = {
  album: Album
  skippedCount: number
  imageUrl: string | null
}

type SpotifyImportResponse = {
  name: string
  imageUrl: string | null
  songs: Array<{
    title: string
    artist: string
    audioUrl: string
    releaseYear?: number
  }>
  skippedCount: number
}

export function isSpotifyImportAvailable(): boolean {
  return isSupabaseConfigured
}

export async function importSpotifyAlbum(
  url: string,
  ownerPlayerId: string,
): Promise<SpotifyImportResult> {
  if (!supabase) {
    throw new Error('Online backend is not configured')
  }

  const { data, error } = await supabase.functions.invoke<SpotifyImportResponse>(
    'spotify-import',
    { body: { url } },
  )

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json()) as { error?: string }
      throw new Error(body.error || error.message)
    }
    throw new Error(error.message || 'Failed to import from Spotify')
  }

  if (!data || 'error' in data || !data.songs?.length) {
    const message =
      data && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'No songs returned from Spotify'
    throw new Error(message)
  }

  const songs: Song[] = data.songs.map((song) => ({
    id: createId('song'),
    title: song.title,
    artist: song.artist,
    album: data.name,
    audioUrl: song.audioUrl,
    releaseYear: song.releaseYear ?? 2000,
  }))

  const album: Album = {
    id: createId('album'),
    name: data.name,
    ownerPlayerId,
    songs,
  }

  return {
    album,
    skippedCount: data.skippedCount,
    imageUrl: data.imageUrl,
  }
}
