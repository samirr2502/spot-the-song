import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { PlaybackState, SpotifyPlayTrackPayload } from '@spot-the-song/shared'
import { SpotifyPlaybackService } from '../lib/spotify/SpotifyPlaybackService'
import { emitWithAck } from '../lib/socketAck'
import { useRoom } from './RoomContext'
import { useSocketContext } from './SocketContext'

type SpotifyPlaybackContextValue = {
  playbackState: PlaybackState
  playbackMessage: string | null
  playerInitialized: boolean
  initializePlayer: () => Promise<void>
  retryPlayback: () => Promise<void>
  stopPlayback: () => Promise<void>
}

const SpotifyPlaybackContext = createContext<SpotifyPlaybackContextValue | null>(null)

export function SpotifyPlaybackProvider({ children }: { children: ReactNode }) {
  const { socket } = useSocketContext()
  const { isHost } = useRoom()
  const serviceRef = useRef<SpotifyPlaybackService | null>(null)
  const lastPayloadRef = useRef<SpotifyPlayTrackPayload | null>(null)

  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle')
  const [playbackMessage, setPlaybackMessage] = useState<string | null>(null)
  const [playerInitialized, setPlayerInitialized] = useState(false)

  const ensureService = useCallback(() => {
    if (!serviceRef.current) {
      const service = new SpotifyPlaybackService()
      service.setStateListener((state, message) => {
        setPlaybackState(state)
        if (message) setPlaybackMessage(message)
      })
      serviceRef.current = service
    }
    return serviceRef.current
  }, [])

  const playPayload = useCallback(
    async (payload: SpotifyPlayTrackPayload) => {
      if (!socket || !isHost) return

      lastPayloadRef.current = payload
      const service = ensureService()

      try {
        await service.initialize()
        setPlayerInitialized(true)
        await service.playTrack({
          uri: payload.spotifyUri,
          startMs: payload.startMs,
          durationMs: payload.durationMs,
        })
        socket.emit('client:spotify-playback-started', {
          roundIndex: payload.roundIndex,
          spotifyUri: payload.spotifyUri,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Spotify playback failed.'
        setPlaybackMessage(message)
        socket.emit('client:spotify-playback-error', {
          roundIndex: payload.roundIndex,
          message,
        })
      }
    },
    [ensureService, isHost, socket],
  )

  const initializePlayer = useCallback(async () => {
    const service = ensureService()
    await service.initialize()
    setPlayerInitialized(true)
    if (socket) {
      socket.emit('client:spotify-player-ready', { deviceId: 'browser' })
    }
  }, [ensureService, socket])

  const retryPlayback = useCallback(async () => {
    if (!socket || !isHost) return

    const ack = await emitWithAck<{ ok: true } | { ok: false; message: string }>(
      socket,
      'client:spotify-retry-playback',
      undefined,
      8_000,
    )

    if (!ack.ok) {
      setPlaybackMessage(ack.message)
      return
    }

    if (lastPayloadRef.current) {
      await playPayload(lastPayloadRef.current)
    }
  }, [isHost, playPayload, socket])

  const stopPlayback = useCallback(async () => {
    await serviceRef.current?.pause()
  }, [])

  useEffect(() => {
    if (!socket || !isHost) return

    const onPlayTrack = (payload: SpotifyPlayTrackPayload) => {
      void playPayload(payload)
    }

    const onClipEnded = () => {
      void serviceRef.current?.pause()
    }

    socket.on('server:spotify-play-track', onPlayTrack)
    socket.on('server:round-clip-ended', onClipEnded)

    return () => {
      socket.off('server:spotify-play-track', onPlayTrack)
      socket.off('server:round-clip-ended', onClipEnded)
    }
  }, [isHost, playPayload, socket])

  useEffect(() => {
    if (!isHost) {
      serviceRef.current?.dispose()
      serviceRef.current = null
      setPlayerInitialized(false)
      setPlaybackState('idle')
      setPlaybackMessage(null)
    }
  }, [isHost])

  useEffect(() => {
    return () => {
      serviceRef.current?.dispose()
      serviceRef.current = null
    }
  }, [])

  const value = useMemo(
    () => ({
      playbackState,
      playbackMessage,
      playerInitialized,
      initializePlayer,
      retryPlayback,
      stopPlayback,
    }),
    [initializePlayer, playbackMessage, playbackState, playerInitialized, retryPlayback, stopPlayback],
  )

  return (
    <SpotifyPlaybackContext.Provider value={value}>{children}</SpotifyPlaybackContext.Provider>
  )
}

export function useSpotifyPlayback() {
  const context = useContext(SpotifyPlaybackContext)
  if (!context) {
    throw new Error('useSpotifyPlayback must be used within SpotifyPlaybackProvider')
  }
  return context
}

export function useOptionalSpotifyPlayback() {
  return useContext(SpotifyPlaybackContext)
}
