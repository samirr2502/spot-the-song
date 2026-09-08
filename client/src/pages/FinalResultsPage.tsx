import { Link, useNavigate, useParams } from 'react-router-dom'
import { SketchAvatar, SketchButton, SketchCard, SketchDivider } from '../components/sketch'
import { useRoom } from '../context/RoomContext'
import { useRoomStatusRedirect } from '../hooks/useRoomNavigation'

export function FinalResultsPage() {
  const navigate = useNavigate()
  const { code = '' } = useParams()
  const { room, session, isHost, busy, playAgain, leaveRoom } = useRoom()

  useRoomStatusRedirect(code, ['final-results'])

  const normalizedCode = code.toUpperCase()
  const inRoom = room?.code === normalizedCode && session?.roomCode === normalizedCode

  const leaderboard = inRoom
    ? room.players
        .map((player) => ({
          ...player,
          score: room.scores[player.id] ?? 0,
        }))
        .sort((a, b) => b.score - a.score)
    : []

  const winner = leaderboard[0]

  async function handlePlayAgain() {
    const ok = await playAgain()
    if (ok) {
      navigate(`/room/${normalizedCode}/how-to-play`)
    }
  }

  async function handleExit() {
    await leaveRoom()
    navigate('/home')
  }

  if (!inRoom || !room) {
    return (
      <main className="page">
        <SketchCard tiltSeed="results-loading">
          <p>Loading results…</p>
        </SketchCard>
      </main>
    )
  }

  return (
    <main className="page">
      <header className="page-header">
        <p className="page-eyebrow">game over</p>
        <h1 className="page-title page-title--sm">Final scores</h1>
      </header>

      {winner ? (
        <SketchCard tiltSeed="winner" className="winner-card">
          <p className="page-eyebrow">winner</p>
          <SketchAvatar name={winner.name} size="lg" />
          <p className="winner-card__name">{winner.name}</p>
          <p className="winner-card__score">{winner.score} pts</p>
        </SketchCard>
      ) : null}

      <SketchCard tiltSeed="final-board">
        <ol className="leaderboard-list">
          {leaderboard.map((entry, index) => (
            <li key={entry.id} className="leaderboard-list__item">
              <span>
                {index + 1}. {entry.name}
                {entry.id === session?.playerId ? ' (you)' : ''}
              </span>
              <span>{entry.score}</span>
            </li>
          ))}
        </ol>
      </SketchCard>

      {isHost ? (
        <SketchButton fullWidth disabled={busy} onClick={handlePlayAgain}>
          Play again
        </SketchButton>
      ) : null}

      <SketchDivider />

      <SketchButton variant="ghost" fullWidth disabled={busy} onClick={handleExit}>
        Exit
      </SketchButton>

      <Link to="/home">
        <SketchButton variant="ghost" fullWidth>
          Home
        </SketchButton>
      </Link>
    </main>
  )
}
