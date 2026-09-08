import type { MusicPreviewResult } from './musicApi'

export function validateCollectionForLobby(
  spotifyUrl: string,
  preview: MusicPreviewResult | null,
): string | null {
  if (!spotifyUrl.trim()) {
    return 'Paste a Spotify playlist or album link first.'
  }

  if (!preview) {
    return 'Check your Spotify link before creating the lobby.'
  }

  if (preview.source !== 'spotify') {
    return 'Import a Spotify playlist or album to create a lobby.'
  }

  return null
}
