import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Album } from '@spot-the-song/game-engine'
import { createId } from '@spot-the-song/game-engine'
import AlbumPicker from '../components/AlbumPicker'
import { SEED_ALBUMS } from '../data/seedSongs'
import {
  addAlbumToRoom,
  fetchRoomState,
  startOnlineGame,
  subscribeToRoom,
} from '../lib/onlineGame'
import { getPlayerSessionId } from '../lib/supabase'

export default function OnlineRoom() {
  const { roomId = '' } = useParams()
  const navigate = useNavigate()
  const playerId = getPlayerSessionId()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [roomCode, setRoomCode] = useState('')
  const [isHost, setIsHost] = useState(false)
  const [players, setPlayers] = useState<Array<{ id: string; name: string }>>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [phase, setPhase] = useState('lobby')
  const [roomSongCount, setRoomSongCount] = useState(0)
  const [starting, setStarting] = useState(false)

  const seedAlbums = useMemo(
    () =>
      SEED_ALBUMS.map((seed) => ({
        id: createId('album'),
        name: seed.name,
        ownerPlayerId: playerId,
        songs: seed.songs.map((song) => ({ ...song, id: createId('song') })),
      })),
    [playerId],
  )

  const loadRoom = useCallback(async () => {
    if (!roomId) return
    try {
      const state = await fetchRoomState(roomId)
      setRoomCode(state.room.code)
      setPhase(state.room.phase)
      setIsHost(state.room.host_player_id === playerId)
      setRoomSongCount(state.songs.length)
      setPlayers(
        state.players.map((player) => ({
          id: player.player_id,
          name: player.name,
        })),
      )

      if (state.room.phase !== 'lobby') {
        navigate(`/online/play/${roomId}`, { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load room')
    } finally {
      setLoading(false)
    }
  }, [navigate, playerId, roomId])

  useEffect(() => {
    void loadRoom()

    let reloadTimer: ReturnType<typeof setTimeout> | undefined
    const scheduleReload = () => {
      window.clearTimeout(reloadTimer)
      reloadTimer = window.setTimeout(() => {
        void loadRoom()
      }, 300)
    }

    const unsubscribe = subscribeToRoom(roomId, scheduleReload)
    return () => {
      window.clearTimeout(reloadTimer)
      unsubscribe()
    }
  }, [loadRoom, roomId])

  async function handleAddAlbums() {
    if (!roomId || albums.length === 0) return
    setError(null)
    try {
      for (const album of albums) {
        await addAlbumToRoom(roomId, playerId, album)
      }
      setAlbums([])
      await loadRoom()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add albums')
    }
  }

  async function handleStart() {
    if (!roomId) return
    setStarting(true)
    setError(null)
    try {
      await startOnlineGame(roomId, playerId)
      navigate(`/online/play/${roomId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game')
    } finally {
      setStarting(false)
    }
  }

  if (loading) {
    return <p className="muted centered">Loading room...</p>
  }

  const joinUrl = `${window.location.origin}/online/join?code=${roomCode}`

  return (
    <div className="stack">
      <h1 className="page-title">Game Lobby</h1>
      <p className="room-code">{roomCode}</p>
      <p className="muted centered">Share this code or link with players</p>
      <div className="qr-placeholder">{joinUrl}</div>

      {error && <div className="alert error">{error}</div>}

      <div className="card-panel stack">
        <h3 className="card-title">Players ({players.length})</h3>
        <ul className="scoreboard-list">
          {players.map((player) => (
            <li key={player.id}>
              <span>{player.name}</span>
              {player.id === playerId && <span className="badge">You</span>}
            </li>
          ))}
        </ul>
        <Link to={`/online/join?code=${roomCode}`} className="btn btn-secondary">
          Invite More Players
        </Link>
      </div>

      <div className="card-panel stack">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title" style={{ margin: 0 }}>Add Albums</h3>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setAlbums(seedAlbums)}
          >
            Load Demo Albums
          </button>
        </div>
        <AlbumPicker ownerPlayerId={playerId} albums={albums} onChange={setAlbums} />
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleAddAlbums}
          disabled={albums.length === 0}
        >
          Upload Albums to Room
        </button>
        <p className="muted">{roomSongCount} songs in room</p>
      </div>

      {isHost && phase === 'lobby' && (
        <div className="centered">
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={handleStart}
            disabled={starting || players.length < 1 || roomSongCount === 0}
          >
            {starting ? 'Starting...' : 'Start Game'}
          </button>
          {roomSongCount === 0 && (
            <p className="muted">Upload at least one album before starting.</p>
          )}
          {roomSongCount > 0 && players.length === 1 && (
            <p className="muted">Solo test mode — add more players anytime before starting.</p>
          )}
        </div>
      )}

      {!isHost && (
        <p className="muted centered">Waiting for the host to start the game...</p>
      )}
    </div>
  )
}
