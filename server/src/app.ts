import express from 'express'
import cors from 'cors'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    }),
  )

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'spot-the-song-server',
      timestamp: Date.now(),
    })
  })

  return app
}
