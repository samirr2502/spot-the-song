import type { Express, Request, Response } from 'express'
import { getClientOrigin } from '../clientOrigin.js'
import { getSpotifyConfig } from '../spotify/config.js'
import {
  buildSpotifyAuthorizeUrl,
  exchangeSpotifyCode,
  getValidAccessToken,
} from '../spotify/oauth.js'
import {
  SPOTIFY_SESSION_COOKIE,
  consumeOAuthState,
  createOAuthState,
  createSpotifySessionId,
  deleteSpotifySession,
  getSpotifySession,
  parseCookies,
  saveSpotifySession,
} from '../spotify/sessionStore.js'

function getSessionId(req: Request): string | null {
  const cookies = parseCookies(req.headers.cookie)
  return cookies[SPOTIFY_SESSION_COOKIE] ?? null
}

function setSessionCookie(res: Response, sessionId: string) {
  res.cookie(SPOTIFY_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  })
}

function clearSessionCookie(res: Response) {
  res.clearCookie(SPOTIFY_SESSION_COOKIE, { path: '/' })
}

export function registerSpotifyAuthRoutes(app: Express, clientOrigin = getClientOrigin()): void {
  app.get('/api/spotify/login', (req, res) => {
    const config = getSpotifyConfig(clientOrigin)
    if (!config) {
      return res.status(503).json({
        error: 'Spotify is not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.',
      })
    }

    const returnTo =
      typeof req.query.returnTo === 'string' && req.query.returnTo.startsWith('/')
        ? req.query.returnTo
        : '/dev/spotify'

    const sessionId = createSpotifySessionId()
    const state = createOAuthState(sessionId, returnTo)
    setSessionCookie(res, sessionId)
    res.redirect(buildSpotifyAuthorizeUrl(config, state))
  })

  app.get('/api/spotify/callback', async (req, res) => {
    const config = getSpotifyConfig(clientOrigin)
    if (!config) {
      return res.redirect(`${clientOrigin}/dev/spotify?error=not_configured`)
    }

    const error = typeof req.query.error === 'string' ? req.query.error : null
    if (error) {
      return res.redirect(`${clientOrigin}/dev/spotify?error=${encodeURIComponent(error)}`)
    }

    const code = typeof req.query.code === 'string' ? req.query.code : null
    const state = typeof req.query.state === 'string' ? req.query.state : null
    if (!code || !state) {
      return res.redirect(`${clientOrigin}/dev/spotify?error=missing_code`)
    }

    const oauth = consumeOAuthState(state)
    const sessionId = oauth?.sessionId ?? getSessionId(req)
    const returnTo = oauth?.returnTo ?? '/dev/spotify'
    if (!sessionId) {
      return res.redirect(`${clientOrigin}${returnTo}?error=invalid_state`)
    }

    try {
      const tokens = await exchangeSpotifyCode(config, code)
      saveSpotifySession(sessionId, tokens)
      setSessionCookie(res, sessionId)
      res.redirect(`${clientOrigin}${returnTo}?connected=1`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'auth_failed'
      res.redirect(`${clientOrigin}${returnTo}?error=${encodeURIComponent(message)}`)
    }
  })

  app.get('/api/spotify/status', (req, res) => {
    const sessionId = getSessionId(req)
    if (!sessionId) {
      return res.json({ connected: false })
    }

    const session = getSpotifySession(sessionId)
    if (!session) {
      return res.json({ connected: false })
    }

    return res.json({
      connected: true,
      displayName: session.displayName,
      product: session.product,
      expiresAt: session.expiresAt,
      premiumRequired: session.product !== 'premium',
    })
  })

  app.get('/api/spotify/access-token', async (req, res) => {
    const config = getSpotifyConfig(clientOrigin)
    if (!config) {
      return res.status(503).json({ error: 'Spotify is not configured.' })
    }

    const sessionId = getSessionId(req)
    if (!sessionId) {
      return res.status(401).json({ error: 'Not connected to Spotify.' })
    }

    const session = getSpotifySession(sessionId)
    if (!session) {
      return res.status(401).json({ error: 'Spotify session expired. Connect again.' })
    }

    try {
      const { accessToken, session: nextSession } = await getValidAccessToken(config, session)
      saveSpotifySession(sessionId, nextSession)
      return res.json({
        accessToken,
        expiresAt: nextSession.expiresAt,
        product: nextSession.product,
      })
    } catch (err) {
      deleteSpotifySession(sessionId)
      clearSessionCookie(res)
      const message = err instanceof Error ? err.message : 'Token refresh failed.'
      return res.status(401).json({ error: message })
    }
  })

  app.post('/api/spotify/disconnect', (req, res) => {
    const sessionId = getSessionId(req)
    if (sessionId) {
      deleteSpotifySession(sessionId)
    }
    clearSessionCookie(res)
    res.json({ ok: true })
  })
}
