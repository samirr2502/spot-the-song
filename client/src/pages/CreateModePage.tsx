import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { PlayMode } from '@spot-the-song/shared'
import { SketchButton, SketchCard, SketchDivider } from '../components/sketch'
import { useRoom } from '../context/RoomContext'

const MODES: Array<{ id: PlayMode; title: string; description: string }> = [
  {
    id: 'all-in',
    title: 'All In',
    description: 'Everyone guesses at once on their own phone.',
  },
  {
    id: 'turns',
    title: 'Turns',
    description: 'One player at a time — guess, sing, or timeline.',
  },
]

export function CreateModePage() {
  const navigate = useNavigate()
  const { createRoom, error, busy, clearError } = useRoom()
  const [selected, setSelected] = useState<PlayMode | null>(null)

  async function handleCreate() {
    if (!selected) return
    clearError()

    const result = await createRoom(selected)
    if (result) {
      navigate(`/room/${result.code}`)
    }
  }

  return (
    <main className="page">
      <header className="page-header">
        <h1 className="page-title page-title--sm">Choose mode</h1>
        <p className="page-subtitle">You can fine-tune settings in the next phase</p>
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

      {error ? <p className="form-error">{error}</p> : null}

      <SketchButton fullWidth disabled={!selected || busy} onClick={handleCreate}>
        {busy ? 'Creating…' : 'Create lobby'}
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
