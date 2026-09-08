export type SpotifyAuthStatus = {
  connected: boolean
  displayName?: string | null
  product?: string | null
  expiresAt?: number
  premiumRequired?: boolean
  error?: string
}

export type SpotifyAccessTokenResponse = {
  accessToken: string
  expiresAt: number
  product?: string | null
  error?: string
}

const jsonHeaders = { Accept: 'application/json' }

export async function fetchSpotifyStatus(): Promise<SpotifyAuthStatus> {
  const response = await fetch('/api/spotify/status', {
    credentials: 'include',
    headers: jsonHeaders,
  })
  return response.json() as Promise<SpotifyAuthStatus>
}

export async function fetchSpotifyAccessToken(): Promise<SpotifyAccessTokenResponse> {
  const response = await fetch('/api/spotify/access-token', {
    credentials: 'include',
    headers: jsonHeaders,
  })
  const data = (await response.json()) as SpotifyAccessTokenResponse
  if (!response.ok) {
    throw new Error(data.error || 'Could not get Spotify access token.')
  }
  return data
}

export function startSpotifyLogin(): void {
  window.location.href = '/api/spotify/login'
}

export async function disconnectSpotify(): Promise<void> {
  await fetch('/api/spotify/disconnect', {
    method: 'POST',
    credentials: 'include',
  })
}

export function parseTrackUri(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('spotify:track:')) {
    return trimmed
  }

  const webMatch = trimmed.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/)
  if (webMatch?.[1]) {
    return `spotify:track:${webMatch[1]}`
  }

  return null
}
