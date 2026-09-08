import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { RoomSessionGate } from '../components/RoomSessionGate'
import { SketchButton, SketchCard } from '../components/sketch'
import { useRoom } from '../context/RoomContext'
import { useRoomStatusRedirect, roomPathForStatus } from '../hooks/useRoomNavigation'

function RoomHowToPlayContent() {
  const navigate = useNavigate()
  const { code = '' } = useParams()
  const { room, session, busy, error, ackHowToPlay, clearError } = useRoom()

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

  async function handleReady() {
    clearError()
    await ackHowToPlay()
  }

  if (!room) return null

  const isTurnGuess = room.settings.playMode === 'turns' && room.settings.turnGame === 'guess'
  const isSingAlong = room.settings.playMode === 'turns' && room.settings.turnGame === 'sing'
  const isTimeline = room.settings.playMode === 'turns' && room.settings.turnGame === 'timeline'

  const modeLabel = isTurnGuess
    ? 'Turn Guess'
    : isSingAlong
      ? 'Sing Along'
      : isTimeline
        ? 'Timeline'
        : 'All In'

  return (
    <main className="page page--fade-in">
      <SketchCard tiltSeed="how-to-play">
        <h1 className="page-title page-title--sm">How to play — {modeLabel}</h1>
        <p className="page-subtitle">Room {normalizedCode}</p>

        {isTurnGuess ? (
          <ul className="how-to-list">
            <li>Each round, one player is active — they listen and guess aloud.</li>
            <li>Everyone else votes YES or NO on each field the host enabled.</li>
            <li>Majority wins per field — ties count as NO.</li>
            <li>The active player earns points for accepted fields.</li>
            <li>Most total points after all rounds wins.</li>
          </ul>
        ) : isSingAlong ? (
          <ul className="how-to-list">
            <li>Each round, one player performs while a song clip plays.</li>
            <li>Only the active player sees the song — sing along out loud!</li>
            <li>Everyone else rates the performance from 1 to 10.</li>
            <li>The average rating becomes that round&apos;s score.</li>
            <li>Most total points after all rounds wins.</li>
          </ul>
        ) : isTimeline ? (
          <ul className="how-to-list">
            <li>Everyone starts with one revealed starter song on their timeline.</li>
            <li>On your turn, listen to a hidden-year clip.</li>
            <li>Place the card before, between, or after your existing cards.</li>
            <li>Optional title/artist guesses can earn bonus points.</li>
            <li>Correct chronological placement keeps the card and scores points.</li>
          </ul>
        ) : (
          <ul className="how-to-list">
            <li>Listen to the clip when each round starts.</li>
            <li>Fill in every field the host enabled (title, artist, album, year).</li>
            <li>Submit before time runs out — faster answers earn a speed bonus.</li>
            <li>Most total points after all rounds wins.</li>
          </ul>
        )}

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

      <Link to={`/room/${normalizedCode}`}>
        <SketchButton variant="ghost" fullWidth>
          Back to lobby
        </SketchButton>
      </Link>
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
