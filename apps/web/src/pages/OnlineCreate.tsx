import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isSupabaseConfigured } from '../lib/supabase'
import { createRoom } from '../lib/onlineGame'

export default function OnlineCreate() {
  const navigate = useNavigate()
  const [hostName, setHostName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!hostName.trim()) return

    if (!isSupabaseConfigured) {
      setError('Online mode requires Supabase. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { room } = await createRoom(hostName.trim())
      navigate(`/online/room/${room.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="stack">
      <h1 className="page-title">Create Online Game</h1>
      <p className="page-subtitle">Host a room and share the join code with friends.</p>

      {!isSupabaseConfigured && (
        <div className="alert error">
          Supabase is not configured. Add environment variables to enable online play.
          Local mode works without a backend.
        </div>
      )}

      <form className="card-panel stack" onSubmit={handleSubmit}>
        <div className="field">
          <label className="label" htmlFor="host-name">Your name</label>
          <input
            id="host-name"
            className="input"
            value={hostName}
            onChange={(event) => setHostName(event.target.value)}
            placeholder="Host name"
          />
        </div>
        {error && <div className="alert error">{error}</div>}
        <div className="row">
          <Link to="/" className="btn btn-ghost">Back</Link>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !hostName.trim()}
          >
            {loading ? 'Creating...' : 'Create Room'}
          </button>
        </div>
      </form>
    </div>
  )
}
