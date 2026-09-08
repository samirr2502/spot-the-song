import { Link } from 'react-router-dom'
import { SketchButton, SketchCard, SketchDivider } from '../components/sketch'
import { getPlayerName } from '../lib/session'

export function HomePage() {
  const playerName = getPlayerName() || 'Player'

  return (
    <main className="page page--home">
      <header className="page-header">
        <p className="page-eyebrow">hey, {playerName}</p>
        <h1 className="page-title">Ready?</h1>
      </header>

      <div className="home-actions">
        <Link to="/join" className="home-link">
          <SketchCard tiltSeed="join" className="home-action-card">
            <h2>Join a game</h2>
            <p>Enter a room code or scan a QR</p>
          </SketchCard>
        </Link>

        <Link to="/create/mode" className="home-link">
          <SketchCard tiltSeed="create" className="home-action-card">
            <h2>Create a game</h2>
            <p>Pick a mode and invite friends</p>
          </SketchCard>
        </Link>
      </div>

      <SketchDivider />

      <Link to="/how-to-play">
        <SketchButton variant="ghost" fullWidth>
          How to play
        </SketchButton>
      </Link>

      <Link to="/" className="home-back">
        <SketchButton variant="ghost" fullWidth>
          Change name
        </SketchButton>
      </Link>
    </main>
  )
}
