import './loadEnv.js'
import { createServer } from 'node:http'
import { createApp } from './app.js'
import { getClientOrigin } from './clientOrigin.js'
import { getSpotifyConfig } from './spotify/config.js'
import { attachSocketHandlers } from './socket.js'

const port = Number(process.env.PORT) || 3001
const clientOrigin = getClientOrigin()

const app = createApp(clientOrigin)
const httpServer = createServer(app)

attachSocketHandlers(httpServer, clientOrigin)

httpServer.listen(port, () => {
  console.log(`Spot the Song server listening on http://localhost:${port}`)
  console.log(`CORS origin: ${clientOrigin}`)
  if (getSpotifyConfig(clientOrigin)) {
    console.log('Spotify OAuth: configured')
  } else {
    console.warn(
      'Spotify OAuth: not configured — set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in server/.env',
    )
  }
})
