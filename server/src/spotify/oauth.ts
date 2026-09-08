import type { SpotifyConfig } from './config.js'
import type { SpotifyTokenSet } from './sessionStore.js'

type SpotifyTokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope: string
  token_type: string
}

type SpotifyProfileResponse = {
  display_name?: string
  product?: string
}

export function buildSpotifyAuthorizeUrl(config: SpotifyConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    state,
    show_dialog: 'true',
    scope: 'streaming user-read-email user-read-private user-modify-playback-state',
  })

  return `https://accounts.spotify.com/authorize?${params.toString()}`
}

async function fetchSpotifyProfile(accessToken: string): Promise<SpotifyProfileResponse> {
  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    return {}
  }

  return response.json() as Promise<SpotifyProfileResponse>
}

export async function exchangeSpotifyCode(
  config: SpotifyConfig,
  code: string,
): Promise<SpotifyTokenSet> {
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Spotify token exchange failed: ${text}`)
  }

  const data = (await response.json()) as SpotifyTokenResponse
  const profile = await fetchSpotifyProfile(data.access_token)

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? '',
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope,
    displayName: profile.display_name ?? null,
    product: profile.product ?? null,
  }
}

export async function refreshSpotifyAccessToken(
  config: SpotifyConfig,
  refreshToken: string,
): Promise<Pick<SpotifyTokenSet, 'accessToken' | 'expiresAt' | 'scope'>> {
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Spotify token refresh failed: ${text}`)
  }

  const data = (await response.json()) as SpotifyTokenResponse
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  }
}

export async function getValidAccessToken(
  config: SpotifyConfig,
  session: SpotifyTokenSet,
): Promise<{ accessToken: string; session: SpotifyTokenSet }> {
  if (Date.now() < session.expiresAt - 60_000) {
    return { accessToken: session.accessToken, session }
  }

  if (!session.refreshToken) {
    throw new Error('Spotify session expired. Connect again.')
  }

  const refreshed = await refreshSpotifyAccessToken(config, session.refreshToken)
  const nextSession: SpotifyTokenSet = {
    ...session,
    accessToken: refreshed.accessToken,
    expiresAt: refreshed.expiresAt,
    scope: refreshed.scope || session.scope,
  }

  return { accessToken: refreshed.accessToken, session: nextSession }
}
