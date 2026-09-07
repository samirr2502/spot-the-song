import { FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { isSupabaseConfigured } from '../lib/supabase'
import { joinRoom } from '../lib/onlineGame'

export default function OnlineJoin() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState(searchParams.get('code') ?? '')
  const [playerName, setPlayerName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!code.trim() || !playerName.trim()) return

    if (!isSupabaseConfigured) {
      setError('Online mode requires Supabase. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { room } = await joinRoom(code.trim(), playerName.trim())
      navigate(`/online/room/${room.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="stack">
      <h1 className="page-title">Join Online Game</h1>
      <p className="page-subtitle">Enter the room code from your host.</p>

      {!isSupabaseConfigured && (
        <div className="alert error">
          Supabase is not configured. Add environment variables to enable online play.
        </div>
      )}

      <form className="card-panel stack" onSubmit={handleSubmit}>
        <div className="field">
          <label className="label" htmlFor="room-code">Room code</label>
          <input
            id="room-code"
            className="input"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="player-name">Your name</label>
          <input
            id="player-name"
            className="input"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="Player name"
          />
        </div>
        {error && <div className="alert error">{error}</div>}
        <div className="row">
          <Link to="/" className="btn btn-ghost">Back</Link>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !code.trim() || !playerName.trim()}
          >
            {loading ? 'Joining...' : 'Join Room'}
          </button>
        </div>
      </form>
    </div>
  )
}
