import express from 'express'
import cors from 'cors'
import { corsOriginCallback, getClientOrigin } from './clientOrigin.js'
import { registerMusicRoutes } from './routes/music.js'
import { registerSpotifyAuthRoutes } from './routes/spotifyAuth.js'

export function createApp(clientOrigin = getClientOrigin()) {
  const app = express()

  app.use(
    cors({
      origin: corsOriginCallback(clientOrigin),
      credentials: true,
    }),
  )

  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'spot-the-song-server',
      timestamp: Date.now(),
    })
  })

  registerMusicRoutes(app)
  registerSpotifyAuthRoutes(app, clientOrigin)

  return app
}
