import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { io, type Socket } from 'socket.io-client'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@spot-the-song/shared'

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

type SocketContextValue = {
  socket: AppSocket | null
  connectionState: ConnectionState
  serverTimeOffset: number | null
  healthOk: boolean | null
}

const SocketContext = createContext<SocketContextValue | null>(null)

const socketOptions = {
  autoConnect: false,
  transports: ['websocket', 'polling'] as ('websocket' | 'polling')[],
}

let sharedSocket: AppSocket | null = null

function getSharedSocket(): AppSocket {
  if (sharedSocket) return sharedSocket

  const explicitUrl = import.meta.env.VITE_SERVER_URL
  if (explicitUrl) {
    sharedSocket = io(explicitUrl, socketOptions)
    return sharedSocket
  }

  // Dev: same-origin via Vite /socket.io proxy (works on any local port)
  if (import.meta.env.DEV) {
    sharedSocket = io(socketOptions)
    return sharedSocket
  }

  sharedSocket = io('http://localhost:3001', socketOptions)
  return sharedSocket
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting')
  const [serverTimeOffset, setServerTimeOffset] = useState<number | null>(null)
  const [healthOk, setHealthOk] = useState<boolean | null>(null)

  const socket = useMemo(() => getSharedSocket(), [])

  useEffect(() => {
    const onConnect = () => setConnectionState('connected')
    const onDisconnect = () => setConnectionState('disconnected')
    const onConnectError = () => setConnectionState('error')
    const onServerConnected = ({ serverTime }: { serverTime: number }) => {
      setServerTimeOffset(serverTime - Date.now())
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)
    socket.on('server:connected', onServerConnected)

    if (socket.connected) {
      setConnectionState('connected')
    } else {
      setConnectionState('connecting')
      socket.connect()
    }

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      socket.off('server:connected', onServerConnected)
    }
  }, [socket])

  useEffect(() => {
    let cancelled = false

    async function checkHealth() {
      try {
        const response = await fetch('/health')
        if (!cancelled) {
          setHealthOk(response.ok)
        }
      } catch {
        if (!cancelled) {
          setHealthOk(false)
        }
      }
    }

    checkHealth()
    const interval = window.setInterval(checkHealth, 15000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (connectionState !== 'connected') return

    socket.emit('client:ping', ({ serverTime }: { serverTime: number }) => {
      setServerTimeOffset(serverTime - Date.now())
    })
  }, [connectionState, socket])

  const value = useMemo(
    () => ({
      socket,
      connectionState,
      serverTimeOffset,
      healthOk,
    }),
    [socket, connectionState, serverTimeOffset, healthOk],
  )

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

export function useSocketContext() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocketContext must be used within SocketProvider')
  }
  return context
}
