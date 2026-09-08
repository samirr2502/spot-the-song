import { createServer } from 'node:http'
import { createApp } from './app.js'
import { attachSocketHandlers } from './socket.js'

const port = Number(process.env.PORT) || 3001
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

const app = createApp()
const httpServer = createServer(app)

attachSocketHandlers(httpServer, clientOrigin)

httpServer.listen(port, () => {
  console.log(`Spot the Song server listening on http://localhost:${port}`)
  console.log(`CORS origin: ${clientOrigin}`)
})
