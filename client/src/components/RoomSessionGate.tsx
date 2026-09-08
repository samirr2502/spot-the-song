import { type ReactNode, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SketchButton, SketchCard } from './sketch'
import { useRoom } from '../context/RoomContext'
import { useSocketContext } from '../context/SocketContext'
import { emitWithAck } from '../lib/socketAck'

type RoomSessionGateProps = {
  roomCode: string
  children: ReactNode
  loadingMessage?: string
}

export function RoomSessionGate({
  roomCode,
  children,
  loadingMessage = 'Syncing your game…',
}: RoomSessionGateProps) {
  const normalizedCode = roomCode.toUpperCase()
  const { socket, connectionState } = useSocketContext()
  const { room, session, error } = useRoom()
  const [gateError, setGateError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  const inRoom = room?.code === normalizedCode && session?.roomCode === normalizedCode

  useEffect(() => {
    if (inRoom || connectionState !== 'connected' || !session || session.roomCode !== normalizedCode || !socket) {
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      if (cancelled) return

      setRetrying(true)
      setGateError(null)

      emitWithAck<{ ok: true } | { ok: false; message: string }>(
        socket,
        'client:reconnect-room',
        { sessionToken: session.sessionToken },
      )
        .then((result) => {
          if (cancelled) return
          if (!result.ok) {
            setGateError(result.message)
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setGateError(err instanceof Error ? err.message : 'Could not restore your session.')
          }
        })
        .finally(() => {
          if (!cancelled) {
            setRetrying(false)
          }
        })
    }, 800)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [inRoom, connectionState, session, normalizedCode, socket])

  if (inRoom) {
    return <>{children}</>
  }

  const waitingMessage =
    connectionState !== 'connected'
      ? 'Waiting for a live server connection…'
      : retrying
        ? loadingMessage
        : 'Restoring your session…'

  return (
    <main className="page page--fade-in">
      <SketchCard tiltSeed="session-gate">
        <h1 className="page-title page-title--sm">Reconnecting…</h1>
        <p className="page-subtitle">{waitingMessage}</p>
      </SketchCard>
      {gateError ? <p className="form-error">{gateError}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {session?.roomCode !== normalizedCode ? (
        <Link to={`/join?code=${normalizedCode}`}>
          <SketchButton fullWidth>Join {normalizedCode}</SketchButton>
        </Link>
      ) : null}
      <Link to="/home">
        <SketchButton variant="ghost" fullWidth>
          Back home
        </SketchButton>
      </Link>
    </main>
  )
}
