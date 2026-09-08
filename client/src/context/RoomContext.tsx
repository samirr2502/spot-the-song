import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  CreateRoomResult,
  JoinRoomResult,
  GameRoom,
  GameSettings,
  RoomSessionPayload,
  RoundResultsPayload,
  SubmitAnswersPayload,
  VotePayload,
  RatingPayload,
  PlaceCardPayload,
  TimelineBonusPayload,
} from '@spot-the-song/shared'
import {
  clearRoomSession,
  getPlayerName,
  getRoomSession,
  saveRoomSession,
} from '../lib/session'
import { resolvePlaybackModeForCreate } from '../lib/playbackMode'
import { emitWithAck } from '../lib/socketAck'
import { useSocketContext } from './SocketContext'

const RECONNECT_ACK_TIMEOUT_MS = 12_000
const CREATE_ROOM_ACK_TIMEOUT_MS = 60_000

type RoomContextValue = {
  room: GameRoom | null
  session: RoomSessionPayload | null
  roundResults: RoundResultsPayload | null
  isHost: boolean
  error: string | null
  busy: boolean
  createRoom: (settings: GameSettings, spotifyUrl?: string) => Promise<{ code: string } | null>
  joinRoom: (code: string, playerName: string) => Promise<{ code: string } | null>
  leaveRoom: () => Promise<void>
  closeRoom: () => Promise<boolean>
  startGame: () => Promise<boolean>
  ackHowToPlay: () => Promise<boolean>
  submitAnswers: (answers: SubmitAnswersPayload) => Promise<boolean>
  submitVotes: (votes: VotePayload) => Promise<boolean>
  submitRating: (payload: RatingPayload) => Promise<boolean>
  placeCard: (payload: PlaceCardPayload) => Promise<boolean>
  submitTimelineBonus: (payload: TimelineBonusPayload) => Promise<boolean>
  hostStartRating: () => Promise<boolean>
  turnGuessDone: () => Promise<boolean>
  continueAfterResults: () => Promise<boolean>
  playAgain: () => Promise<boolean>
  returnToLobby: () => Promise<boolean>
  updateLobby: (settings: GameSettings, spotifyUrl?: string) => Promise<boolean>
  clearError: () => void
}

const RoomContext = createContext<RoomContextValue | null>(null)

export function RoomProvider({ children }: { children: ReactNode }) {
  const { socket, connectionState } = useSocketContext()
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [session, setSession] = useState<RoomSessionPayload | null>(() => getRoomSession())
  const [roundResults, setRoundResults] = useState<RoundResultsPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reconnectAttempted, setReconnectAttempted] = useState(false)

  useEffect(() => {
    if (!socket) return

    const onRoomState = (nextRoom: GameRoom) => {
      setRoom(nextRoom)
      if (nextRoom.status !== 'round-results') {
        setRoundResults(null)
      }
    }

    const onRoundResults = (payload: RoundResultsPayload) => {
      setRoundResults(payload)
    }

    const onError = ({ message }: { message: string }) => {
      setError(message)
    }

    const onRoomClosed = ({ message }: { message: string }) => {
      clearRoomSession()
      setSession(null)
      setRoom(null)
      setRoundResults(null)
      setError(message)
      setBusy(false)
    }

    socket.on('server:room-state', onRoomState)
    socket.on('server:round-results', onRoundResults)
    socket.on('server:error', onError)
    socket.on('server:room-closed', onRoomClosed)

    return () => {
      socket.off('server:room-state', onRoomState)
      socket.off('server:round-results', onRoundResults)
      socket.off('server:error', onError)
      socket.off('server:room-closed', onRoomClosed)
    }
  }, [socket])

  useEffect(() => {
    if (connectionState === 'connected') return
    setBusy(false)
  }, [connectionState])

  useEffect(() => {
    if (!socket || connectionState !== 'connected' || reconnectAttempted) return

    const stored = getRoomSession()
    if (!stored) {
      setReconnectAttempted(true)
      return
    }

    let cancelled = false
    setBusy(true)

    emitWithAck<{ ok: true } | { ok: false; message: string }>(
      socket,
      'client:reconnect-room',
      { sessionToken: stored.sessionToken },
      RECONNECT_ACK_TIMEOUT_MS,
    )
      .then((result) => {
        if (cancelled) return

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
      .catch((err) => {
        if (cancelled) return

        setReconnectAttempted(true)
        setBusy(false)
        clearRoomSession()
        setSession(null)
        setRoom(null)
        setError(err instanceof Error ? err.message : 'Could not restore your session.')
      })

    return () => {
      cancelled = true
    }
  }, [socket, connectionState, reconnectAttempted])

  const persistSession = useCallback((payload: RoomSessionPayload) => {
    saveRoomSession(payload)
    setSession(payload)
  }, [])

  const createRoom = useCallback(
    async (settings: GameSettings, spotifyUrl?: string): Promise<{ code: string } | null> => {
      if (!socket) {
        setError('Still connecting to the server…')
        return null
      }

      if (connectionState !== 'connected') {
        setError('Not connected to the server yet. Wait for “Live” in the corner, then try again.')
        return null
      }

      const name = getPlayerName()
      if (!name) {
        setError('Enter your name before creating a room.')
        return null
      }

      setBusy(true)
      setError(null)

      try {
        const result = await emitWithAck<CreateRoomResult>(
          socket,
          'client:create-room',
          { playerName: name, settings: { ...settings, playbackMode: resolvePlaybackModeForCreate() }, spotifyUrl: spotifyUrl?.trim() || undefined },
          CREATE_ROOM_ACK_TIMEOUT_MS,
        )

        if (!result.ok) {
          setError(result.message)
          return null
        }

        const payload: RoomSessionPayload = {
          playerId: result.playerId,
          sessionToken: result.sessionToken,
          roomCode: result.code,
        }
        persistSession(payload)
        return { code: result.code }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not create the room.')
        return null
      } finally {
        setBusy(false)
      }
    },
    [socket, connectionState, persistSession],
  )

  const joinRoom = useCallback(
    async (code: string, playerName: string): Promise<{ code: string } | null> => {
      if (!socket) {
        setError('Still connecting to the server…')
        return null
      }

      if (connectionState !== 'connected') {
        setError('Not connected to the server yet. Wait for “Live” in the corner, then try again.')
        return null
      }

      setBusy(true)
      setError(null)

      try {
        const result = await emitWithAck<JoinRoomResult>(
          socket,
          'client:join-room',
          { code, playerName },
        )

        if (!result.ok) {
          setError(result.message)
          return null
        }

        const payload: RoomSessionPayload = {
          playerId: result.playerId,
          sessionToken: result.sessionToken,
          roomCode: result.code,
        }
        persistSession(payload)
        return { code: result.code }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not join the room.')
        return null
      } finally {
        setBusy(false)
      }
    },
    [socket, connectionState, persistSession],
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
    setRoundResults(null)
    setBusy(false)
  }, [socket])

  const closeRoom = useCallback(async (): Promise<boolean> => {
    if (!socket) return false

    setBusy(true)
    setError(null)

    try {
      const result = await emitWithAck<{ ok: true } | { ok: false; message: string }>(
        socket,
        'client:close-room',
        undefined,
        8_000,
      )

      if (!result.ok) {
        setError(result.message)
        setBusy(false)
        return false
      }

      clearRoomSession()
      setSession(null)
      setRoom(null)
      setRoundResults(null)
      setBusy(false)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not close the room.')
      setBusy(false)
      return false
    }
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

  const ackHowToPlay = useCallback(async (): Promise<boolean> => {
    if (!socket) return false

    setBusy(true)
    setError(null)

    return new Promise((resolve) => {
      socket.emit('client:ack-how-to-play', (result) => {
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

  const submitAnswers = useCallback(
    async (answers: SubmitAnswersPayload): Promise<boolean> => {
      if (!socket) return false

      setBusy(true)
      setError(null)

      return new Promise((resolve) => {
        socket.emit('client:submit-answers', answers, (result) => {
          setBusy(false)

          if (!result.ok) {
            setError(result.message)
            resolve(false)
            return
          }

          resolve(true)
        })
      })
    },
    [socket],
  )

  const submitVotes = useCallback(
    async (votes: VotePayload): Promise<boolean> => {
      if (!socket) return false

      setBusy(true)
      setError(null)

      return new Promise((resolve) => {
        socket.emit('client:submit-votes', votes, (result) => {
          setBusy(false)

          if (!result.ok) {
            setError(result.message)
            resolve(false)
            return
          }

          resolve(true)
        })
      })
    },
    [socket],
  )

  const submitRating = useCallback(
    async (payload: RatingPayload): Promise<boolean> => {
      if (!socket) return false

      setBusy(true)
      setError(null)

      return new Promise((resolve) => {
        socket.emit('client:submit-rating', payload, (result) => {
          setBusy(false)

          if (!result.ok) {
            setError(result.message)
            resolve(false)
            return
          }

          resolve(true)
        })
      })
    },
    [socket],
  )

  const placeCard = useCallback(
    async (payload: PlaceCardPayload): Promise<boolean> => {
      if (!socket) return false

      setBusy(true)
      setError(null)

      return new Promise((resolve) => {
        socket.emit('client:place-card', payload, (result) => {
          setBusy(false)

          if (!result.ok) {
            setError(result.message)
            resolve(false)
            return
          }

          resolve(true)
        })
      })
    },
    [socket],
  )

  const submitTimelineBonus = useCallback(
    async (payload: TimelineBonusPayload): Promise<boolean> => {
      if (!socket) return false

      setBusy(true)
      setError(null)

      return new Promise((resolve) => {
        socket.emit('client:submit-timeline-bonus', payload, (result) => {
          setBusy(false)

          if (!result.ok) {
            setError(result.message)
            resolve(false)
            return
          }

          resolve(true)
        })
      })
    },
    [socket],
  )

  const hostStartRating = useCallback(async (): Promise<boolean> => {
    if (!socket) return false

    setBusy(true)
    setError(null)

    return new Promise((resolve) => {
      socket.emit('client:host-start-rating', (result) => {
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

  const turnGuessDone = useCallback(async (): Promise<boolean> => {
    if (!socket) return false

    setBusy(true)
    setError(null)

    return new Promise((resolve) => {
      socket.emit('client:turn-guess-done', (result) => {
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

  const continueAfterResults = useCallback(async (): Promise<boolean> => {
    if (!socket) return false

    setBusy(true)
    setError(null)

    return new Promise((resolve) => {
      socket.emit('client:continue-after-results', (result) => {
        setBusy(false)

        if (!result.ok) {
          setError(result.message)
          resolve(false)
          return
        }

        setRoundResults(null)
        resolve(true)
      })
    })
  }, [socket])

  const playAgain = useCallback(async (): Promise<boolean> => {
    if (!socket) return false

    setBusy(true)
    setError(null)

    return new Promise((resolve) => {
      socket.emit('client:play-again', (result) => {
        setBusy(false)

        if (!result.ok) {
          setError(result.message)
          resolve(false)
          return
        }

        setRoundResults(null)
        resolve(true)
      })
    })
  }, [socket])

  const returnToLobby = useCallback(async (): Promise<boolean> => {
    if (!socket) return false

    setBusy(true)
    setError(null)

    return new Promise((resolve) => {
      socket.emit('client:return-to-lobby', (result) => {
        setBusy(false)

        if (!result.ok) {
          setError(result.message)
          resolve(false)
          return
        }

        setRoom(result.room)
        setRoundResults(null)
        resolve(true)
      })
    })
  }, [socket])

  const updateLobby = useCallback(
    async (settings: GameSettings, spotifyUrl?: string): Promise<boolean> => {
      if (!socket) return false

      setBusy(true)
      setError(null)

      try {
        const result = await emitWithAck<{ ok: true } | { ok: false; message: string }>(
          socket,
          'client:update-lobby',
          { settings, spotifyUrl },
          CREATE_ROOM_ACK_TIMEOUT_MS,
        )
        setBusy(false)

        if (!result.ok) {
          setError(result.message)
          return false
        }

        return true
      } catch {
        setBusy(false)
        setError('Could not update lobby settings.')
        return false
      }
    },
    [socket],
  )

  const isHost = useMemo(() => {
    if (!room || !session) return false
    return room.hostPlayerId === session.playerId
  }, [room, session])

  const value = useMemo(
    () => ({
      room,
      session,
      roundResults,
      isHost,
      error,
      busy,
      createRoom,
      joinRoom,
      leaveRoom,
      closeRoom,
      startGame,
      ackHowToPlay,
      submitAnswers,
      submitVotes,
      submitRating,
      placeCard,
      submitTimelineBonus,
      hostStartRating,
      turnGuessDone,
      continueAfterResults,
      playAgain,
      returnToLobby,
      updateLobby,
      clearError: () => setError(null),
    }),
    [
      room,
      session,
      roundResults,
      isHost,
      error,
      busy,
      createRoom,
      joinRoom,
      leaveRoom,
      closeRoom,
      startGame,
      ackHowToPlay,
      submitAnswers,
      submitVotes,
      submitRating,
      placeCard,
      submitTimelineBonus,
      hostStartRating,
      turnGuessDone,
      continueAfterResults,
      playAgain,
      returnToLobby,
      updateLobby,
    ],
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
