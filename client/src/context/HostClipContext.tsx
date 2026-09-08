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
import type { HostClipPlayPayload } from '@spot-the-song/shared'
import { emitWithAck } from '../lib/socketAck'
import { useRoom } from './RoomContext'
import { useSocketContext } from './SocketContext'

type HostClipAudioState = 'idle' | 'loading' | 'playing' | 'error' | 'muted'

type HostClipContextValue = {
  clipPayload: HostClipPlayPayload | null
  audioState: HostClipAudioState
  retryPlayback: () => Promise<void>
}

const HostClipContext = createContext<HostClipContextValue | null>(null)

export function HostClipProvider({ children }: { children: ReactNode }) {
  const { socket } = useSocketContext()
  const { isHost } = useRoom()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [clipPayload, setClipPayload] = useState<HostClipPlayPayload | null>(null)
  const [audioState, setAudioState] = useState<HostClipAudioState>('idle')

  const stopAudio = useCallback(() => {
    audioRef.current?.pause()
    audioRef.current = null
    setAudioState('idle')
  }, [])

  const playPayload = useCallback(
    (payload: HostClipPlayPayload) => {
      setClipPayload(payload)
      stopAudio()

      if (!payload.previewUrl) {
        setAudioState('muted')
        return
      }

      setAudioState('loading')
      const audio = new Audio(payload.previewUrl)
      audioRef.current = audio

      const onPlaying = () => setAudioState('playing')
      const onError = () => setAudioState('error')

      audio.addEventListener('playing', onPlaying)
      audio.addEventListener('error', onError)

      void audio.play().catch(() => {
        setAudioState('error')
      })
    },
    [stopAudio],
  )

  const retryPlayback = useCallback(async () => {
    if (!socket || !isHost) return

    const ack = await emitWithAck<{ ok: true } | { ok: false; message: string }>(
      socket,
      'client:spotify-retry-playback',
      undefined,
      8_000,
    )

    if (!ack.ok) {
      setAudioState('error')
      return
    }

    if (clipPayload) {
      playPayload(clipPayload)
    }
  }, [clipPayload, isHost, playPayload, socket])

  useEffect(() => {
    if (!socket || !isHost) return

    const onPlayClip = (payload: HostClipPlayPayload) => {
      playPayload(payload)
    }

    const onClipEnded = () => {
      stopAudio()
    }

    socket.on('server:host-play-clip', onPlayClip)
    socket.on('server:round-clip-ended', onClipEnded)

    return () => {
      socket.off('server:host-play-clip', onPlayClip)
      socket.off('server:round-clip-ended', onClipEnded)
    }
  }, [isHost, playPayload, socket, stopAudio])

  useEffect(() => {
    if (!isHost) {
      stopAudio()
      setClipPayload(null)
    }
  }, [isHost, stopAudio])

  useEffect(() => {
    return () => {
      stopAudio()
    }
  }, [stopAudio])

  const value = useMemo(
    () => ({
      clipPayload,
      audioState,
      retryPlayback,
    }),
    [audioState, clipPayload, retryPlayback],
  )

  return <HostClipContext.Provider value={value}>{children}</HostClipContext.Provider>
}

export function useHostClip() {
  const context = useContext(HostClipContext)
  if (!context) {
    throw new Error('useHostClip must be used within HostClipProvider')
  }
  return context
}

export function useOptionalHostClip() {
  return useContext(HostClipContext)
}
