import express from 'express'
import cors from 'cors'
import { registerMusicRoutes } from './routes/music.js'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
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

  return app
}
