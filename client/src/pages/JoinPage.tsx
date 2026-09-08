import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { SketchButton, SketchCard, SketchInput } from '../components/sketch'
import { useRoom } from '../context/RoomContext'
import { getPlayerName } from '../lib/session'

export function JoinPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { joinRoom, error, busy, clearError } = useRoom()
  const [code, setCode] = useState(() => searchParams.get('code')?.toUpperCase() ?? '')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    clearError()

    const playerName = getPlayerName()
    const result = await joinRoom(code, playerName)
    if (result) {
      navigate(`/room/${result.code}`)
    }
  }

  return (
    <main className="page">
      <header className="page-header">
        <h1 className="page-title page-title--sm">Join a game</h1>
        <p className="page-subtitle">Enter the 6-letter room code from your host</p>
      </header>

      <SketchCard tiltSeed="join-form">
        <form className="join-form" onSubmit={handleSubmit}>
          <SketchInput
            label="Room code"
            name="roomCode"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="ABC123"
            autoComplete="off"
            autoCapitalize="characters"
            inputMode="text"
            maxLength={6}
            autoFocus
          />

          {error ? <p className="form-error">{error}</p> : null}

          <SketchButton type="submit" fullWidth disabled={busy || code.length !== 6}>
            {busy ? 'Joining…' : 'Join lobby'}
          </SketchButton>
        </form>
      </SketchCard>

      <Link to="/home">
        <SketchButton variant="ghost" fullWidth>
          Back home
        </SketchButton>
      </Link>
    </main>
  )
}
