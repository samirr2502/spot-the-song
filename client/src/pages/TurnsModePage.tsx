import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { TurnGame } from '@spot-the-song/shared'
import { SketchButton, SketchCard, SketchDivider } from '../components/sketch'

const TURN_GAMES: Array<{
  id: TurnGame
  title: string
  description: string
  setupPath: string
  available: boolean
}> = [
  {
    id: 'guess',
    title: 'Guess',
    description: 'One player guesses aloud — everyone else votes YES or NO.',
    setupPath: '/create/turns/guess',
    available: true,
  },
  {
    id: 'sing',
    title: 'Sing Along',
    description: 'Perform for the room — audience rates your show.',
    setupPath: '/create/turns/sing',
    available: true,
  },
  {
    id: 'timeline',
    title: 'Timeline',
    description: 'Place songs in chronological order on your timeline.',
    setupPath: '/create/turns/timeline',
    available: true,
  },
]

export function TurnsModePage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<TurnGame | null>(null)

  function handleContinue() {
    if (!selected) return
    const game = TURN_GAMES.find((entry) => entry.id === selected)
    if (game?.available) {
      navigate(game.setupPath)
    }
  }

  return (
    <main className="page">
      <header className="page-header">
        <h1 className="page-title page-title--sm">Turns — pick a game</h1>
        <p className="page-subtitle">One player at a time</p>
      </header>

      <div className="mode-list">
        {TURN_GAMES.map((game) => {
          const active = selected === game.id
          return (
            <button
              key={game.id}
              type="button"
              className={`mode-option${active ? ' mode-option--active' : ''}${!game.available ? ' mode-option--disabled' : ''}`}
              onClick={() => game.available && setSelected(game.id)}
              disabled={!game.available}
            >
              <SketchCard tiltSeed={game.id} className="mode-option__card">
                <h2>{game.title}</h2>
                <p>{game.description}</p>
                {!game.available ? <p className="mode-option__soon">Coming soon</p> : null}
              </SketchCard>
            </button>
          )
        })}
      </div>

      <SketchButton fullWidth disabled={!selected} onClick={handleContinue}>
        Continue
      </SketchButton>

      <SketchDivider />

      <Link to="/create/mode">
        <SketchButton variant="ghost" fullWidth>
          Back
        </SketchButton>
      </Link>
    </main>
  )
}
