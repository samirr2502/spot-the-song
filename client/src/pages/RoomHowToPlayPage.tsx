import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { RoomSessionGate } from '../components/RoomSessionGate'
import { HowToPlaySteps } from '../components/HowToPlaySteps'
import { SketchButton, SketchCard } from '../components/sketch'
import { useRoom } from '../context/RoomContext'
import { useRoomStatusRedirect, roomPathForStatus } from '../hooks/useRoomNavigation'
import { getHowToPlayModeForSettings } from '../lib/howToPlay'

function RoomHowToPlayContent() {
  const navigate = useNavigate()
  const { code = '' } = useParams()
  const { room, session, busy, error, ackHowToPlay, returnToLobby, clearError, isHost } = useRoom()

  useRoomStatusRedirect(code, ['how-to-play'])

  const normalizedCode = code.toUpperCase()
  const readyIds = room?.readyPlayerIds ?? []
  const connectedCount = room?.players.filter((player) => player.connected).length ?? 0
  const isReady = !!session && readyIds.includes(session.playerId)

  useEffect(() => {
    if (room?.status === 'playing' && room.code === normalizedCode) {
      navigate(`/room/${normalizedCode}/play`, { replace: true })
    }
  }, [room?.status, room?.code, normalizedCode, navigate])

  useEffect(() => {
    if (room?.code === normalizedCode && room.status === 'lobby') {
      navigate(`/room/${normalizedCode}`, { replace: true })
    }
  }, [room?.status, room?.code, normalizedCode, navigate])

  async function handleReady() {
    clearError()
    await ackHowToPlay()
  }

  async function handleBackToLobby() {
    if (!isHost) return
    clearError()
    const ok = await returnToLobby()
    if (ok) {
      navigate(`/room/${normalizedCode}`, { replace: true })
    }
  }

  if (!room) return null

  const mode = getHowToPlayModeForSettings(room.settings)

  return (
    <main className="page page--fade-in">
      <SketchCard tiltSeed="how-to-play">
        <h1 className="page-title page-title--sm">How to play — {mode.title}</h1>
        <HowToPlaySteps mode={mode} showTagline={false} />

        <p className="lobby-players__status">
          Ready: {readyIds.length} / {connectedCount}
        </p>
      </SketchCard>

      {error ? <p className="form-error">{error}</p> : null}

      {!isReady ? (
        <SketchButton fullWidth disabled={busy} onClick={handleReady}>
          {busy ? '…' : "I'm ready"}
        </SketchButton>
      ) : (
        <SketchCard tiltSeed="ready-wait" className="lobby-wait-card">
          <p>You're ready — waiting for everyone else…</p>
        </SketchCard>
      )}

      {room.status !== 'how-to-play' ? (
        <Link to={roomPathForStatus(room.code, room.status)}>
          <SketchButton fullWidth>Go to game</SketchButton>
        </Link>
      ) : null}

      {isHost ? (
        <SketchButton variant="ghost" fullWidth disabled={busy} onClick={() => void handleBackToLobby()}>
          Back to lobby
        </SketchButton>
      ) : null}
    </main>
  )
}

export function RoomHowToPlayPage() {
  const { code = '' } = useParams()

  return (
    <RoomSessionGate roomCode={code} loadingMessage="Syncing room…">
      <RoomHowToPlayContent />
    </RoomSessionGate>
  )
}
