export type SpotifyTokenSet = {
  accessToken: string
  refreshToken: string
  expiresAt: number
  scope: string
  displayName: string | null
  product: string | null
}

const sessions = new Map<string, SpotifyTokenSet>()
const oauthStates = new Map<string, { sessionId: string; createdAt: number }>()

const STATE_TTL_MS = 10 * 60 * 1000

export function createSpotifySessionId(): string {
  return `spotify_${crypto.randomUUID()}`
}

export function createOAuthState(sessionId: string): string {
  const state = crypto.randomUUID()
  oauthStates.set(state, { sessionId, createdAt: Date.now() })
  return state
}

export function consumeOAuthState(state: string): string | null {
  const entry = oauthStates.get(state)
  oauthStates.delete(state)
  if (!entry) return null
  if (Date.now() - entry.createdAt > STATE_TTL_MS) return null
  return entry.sessionId
}

export function saveSpotifySession(sessionId: string, tokens: SpotifyTokenSet): void {
  sessions.set(sessionId, tokens)
}

export function getSpotifySession(sessionId: string): SpotifyTokenSet | null {
  return sessions.get(sessionId) ?? null
}

export function deleteSpotifySession(sessionId: string): void {
  sessions.delete(sessionId)
}

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {}
  return Object.fromEntries(
    header.split(';').map((part) => {
      const [key, ...rest] = part.trim().split('=')
      return [key, decodeURIComponent(rest.join('='))]
    }),
  )
}

export const SPOTIFY_SESSION_COOKIE = 'sts_spotify_session'
