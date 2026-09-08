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

const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

export function SocketProvider({ children }: { children: ReactNode }) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting')
  const [serverTimeOffset, setServerTimeOffset] = useState<number | null>(null)
  const [healthOk, setHealthOk] = useState<boolean | null>(null)

  const socket = useMemo(
    () =>
      io(serverUrl, {
        autoConnect: true,
        transports: ['websocket', 'polling'],
      }),
    [],
  )

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
    }

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      socket.off('server:connected', onServerConnected)
      socket.disconnect()
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
