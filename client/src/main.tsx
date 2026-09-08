import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { RoomProvider } from './context/RoomContext'
import { SocketProvider } from './context/SocketContext'
import './styles/global.css'

// Spotify OAuth requires 127.0.0.1 — redirect old localhost bookmarks in dev
if (import.meta.env.DEV && window.location.hostname === 'localhost') {
  window.location.replace(
    `${window.location.protocol}//127.0.0.1${window.location.port ? `:${window.location.port}` : ''}${window.location.pathname}${window.location.search}${window.location.hash}`,
  )
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <SocketProvider>
          <RoomProvider>
            <App />
          </RoomProvider>
        </SocketProvider>
      </BrowserRouter>
    </StrictMode>,
  )
}
