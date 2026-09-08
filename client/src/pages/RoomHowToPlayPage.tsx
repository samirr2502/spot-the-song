import { Link, useParams } from 'react-router-dom'
import { SketchButton, SketchCard } from '../components/sketch'
import { useRoom } from '../context/RoomContext'

export function RoomHowToPlayPage() {
  const { code = '' } = useParams()
  const { room, isHost } = useRoom()
  const normalizedCode = code.toUpperCase()

  const modeLabel =
    room?.settings.playMode === 'all-in'
      ? 'All In — everyone answers at once on their phone.'
      : `Turns — ${room?.settings.turnGame ?? 'guess / sing / timeline'} (full setup in later phases).`

  return (
    <main className="page">
      <SketchCard tiltSeed="how-to-play">
        <h1 className="page-title page-title--sm">How to play</h1>
        <p className="page-subtitle">Room {normalizedCode}</p>

        <ul className="how-to-list">
          <li>Listen to the song clip when a round starts.</li>
          <li>{modeLabel}</li>
          <li>Score points for correct answers — fastest wins bonuses in All In.</li>
          <li>Most points after all rounds wins the party.</li>
        </ul>

        <p className="placeholder-note">
          Gameplay rounds arrive in Phase 2+. The lobby and start flow are live.
        </p>
      </SketchCard>

      {isHost ? (
        <SketchButton fullWidth disabled>
          Begin round (Phase 2)
        </SketchButton>
      ) : null}

      <Link to={`/room/${normalizedCode}`}>
        <SketchButton variant="ghost" fullWidth>
          Back to lobby
        </SketchButton>
      </Link>
    </main>
  )
}
