import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { PlayMode } from '@spot-the-song/shared'
import { SketchButton, SketchCard, SketchDivider } from '../components/sketch'

const MODES: Array<{ id: PlayMode; title: string; description: string; setupPath: string }> = [
  {
    id: 'all-in',
    title: 'All In',
    description: 'Everyone guesses at once on their own phone.',
    setupPath: '/create/all-in',
  },
  {
    id: 'turns',
    title: 'Turns',
    description: 'One player at a time — guess, sing, or timeline.',
    setupPath: '/create/turns',
  },
]

export function CreateModePage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<PlayMode | null>(null)

  function handleContinue() {
    if (!selected) return
    const mode = MODES.find((entry) => entry.id === selected)
    if (mode) navigate(mode.setupPath)
  }

  return (
    <main className="page">
      <header className="page-header">
        <h1 className="page-title page-title--sm">Choose mode</h1>
        <p className="page-subtitle">Configure your game next</p>
      </header>

      <div className="mode-list">
        {MODES.map((mode) => {
          const active = selected === mode.id
          return (
            <button
              key={mode.id}
              type="button"
              className={`mode-option${active ? ' mode-option--active' : ''}`}
              onClick={() => setSelected(mode.id)}
            >
              <SketchCard tiltSeed={mode.id} className="mode-option__card">
                <h2>{mode.title}</h2>
                <p>{mode.description}</p>
              </SketchCard>
            </button>
          )
        })}
      </div>

      <SketchButton fullWidth disabled={!selected} onClick={handleContinue}>
        Continue
      </SketchButton>

      <SketchDivider />

      <Link to="/home">
        <SketchButton variant="ghost" fullWidth>
          Back home
        </SketchButton>
      </Link>
    </main>
  )
}
