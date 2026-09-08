import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { GameRoom, PlayMode, RoomSessionPayload } from '@spot-the-song/shared'
import {
  clearRoomSession,
  getPlayerName,
  getRoomSession,
  saveRoomSession,
} from '../lib/session'
import { useSocketContext } from './SocketContext'

type RoomContextValue = {
  room: GameRoom | null
  session: RoomSessionPayload | null
  isHost: boolean
  error: string | null
  busy: boolean
  createRoom: (playMode: PlayMode) => Promise<{ code: string } | null>
  joinRoom: (code: string, playerName: string) => Promise<{ code: string } | null>
  leaveRoom: () => Promise<void>
  startGame: () => Promise<boolean>
  clearError: () => void
}

const RoomContext = createContext<RoomContextValue | null>(null)

export function RoomProvider({ children }: { children: ReactNode }) {
  const { socket, connectionState } = useSocketContext()
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [session, setSession] = useState<RoomSessionPayload | null>(() => getRoomSession())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reconnectAttempted, setReconnectAttempted] = useState(false)

  useEffect(() => {
    if (!socket) return

    const onRoomState = (nextRoom: GameRoom) => {
      setRoom(nextRoom)
    }

    const onError = ({ message }: { message: string }) => {
      setError(message)
    }

    socket.on('server:room-state', onRoomState)
    socket.on('server:error', onError)

    return () => {
      socket.off('server:room-state', onRoomState)
      socket.off('server:error', onError)
    }
  }, [socket])

  useEffect(() => {
    if (!socket || connectionState !== 'connected' || reconnectAttempted) return

    const stored = getRoomSession()
    if (!stored) {
      setReconnectAttempted(true)
      return
    }

    setBusy(true)
    socket.emit('client:reconnect-room', { sessionToken: stored.sessionToken }, (result) => {
      setReconnectAttempted(true)
      setBusy(false)

      if (result.ok) {
        setSession(stored)
        return
      }

      clearRoomSession()
      setSession(null)
      setRoom(null)
    })
  }, [socket, connectionState, reconnectAttempted])

  const persistSession = useCallback((payload: RoomSessionPayload) => {
    saveRoomSession(payload)
    setSession(payload)
  }, [])

  const createRoom = useCallback(
    async (playMode: PlayMode): Promise<{ code: string } | null> => {
      if (!socket) return null

      const name = getPlayerName()
      if (!name) {
        setError('Enter your name before creating a room.')
        return null
      }

      setBusy(true)
      setError(null)

      return new Promise((resolve) => {
        socket.emit('client:create-room', { playerName: name, playMode }, (result) => {
          setBusy(false)

          if (!result.ok) {
            setError(result.message)
            resolve(null)
            return
          }

          const payload: RoomSessionPayload = {
            playerId: result.playerId,
            sessionToken: result.sessionToken,
            roomCode: result.code,
          }
          persistSession(payload)
          resolve({ code: result.code })
        })
      })
    },
    [socket, persistSession],
  )

  const joinRoom = useCallback(
    async (code: string, playerName: string): Promise<{ code: string } | null> => {
      if (!socket) return null

      setBusy(true)
      setError(null)

      return new Promise((resolve) => {
        socket.emit('client:join-room', { code, playerName }, (result) => {
          setBusy(false)

          if (!result.ok) {
            setError(result.message)
            resolve(null)
            return
          }

          const payload: RoomSessionPayload = {
            playerId: result.playerId,
            sessionToken: result.sessionToken,
            roomCode: result.code,
          }
          persistSession(payload)
          resolve({ code: result.code })
        })
      })
    },
    [socket, persistSession],
  )

  const leaveRoom = useCallback(async () => {
    if (!socket) return

    setBusy(true)
    await new Promise<void>((resolve) => {
      socket.emit('client:leave-room', () => {
        resolve()
      })
    })

    clearRoomSession()
    setSession(null)
    setRoom(null)
    setBusy(false)
  }, [socket])

  const startGame = useCallback(async (): Promise<boolean> => {
    if (!socket) return false

    setBusy(true)
    setError(null)

    return new Promise((resolve) => {
      socket.emit('client:start-game', (result) => {
        setBusy(false)

        if (!result.ok) {
          setError(result.message)
          resolve(false)
          return
        }

        resolve(true)
      })
    })
  }, [socket])

  const isHost = useMemo(() => {
    if (!room || !session) return false
    return room.hostPlayerId === session.playerId
  }, [room, session])

  const value = useMemo(
    () => ({
      room,
      session,
      isHost,
      error,
      busy,
      createRoom,
      joinRoom,
      leaveRoom,
      startGame,
      clearError: () => setError(null),
    }),
    [room, session, isHost, error, busy, createRoom, joinRoom, leaveRoom, startGame],
  )

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>
}

export function useRoom() {
  const context = useContext(RoomContext)
  if (!context) {
    throw new Error('useRoom must be used within RoomProvider')
  }
  return context
}
