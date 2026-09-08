export type SpotifyConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
  clientOrigin: string
}

export function getSpotifyConfig(clientOrigin: string): SpotifyConfig | null {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim()
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim()
  const redirectUri =
    process.env.SPOTIFY_REDIRECT_URI?.trim() ||
    `http://127.0.0.1:${process.env.PORT || 3001}/api/spotify/callback`

  if (!clientId || !clientSecret) return null

  return {
    clientId,
    clientSecret,
    redirectUri,
    clientOrigin,
  }
}

export const SPOTIFY_SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
].join(' ')
