import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Album } from '@spot-the-song/game-engine'
import { createGame, createId } from '@spot-the-song/game-engine'
import AlbumPicker from '../components/AlbumPicker'
import { SEED_ALBUMS } from '../data/seedSongs'

export default function LocalSetup() {
  const navigate = useNavigate()
  const [playerName, setPlayerName] = useState('')
  const [players, setPlayers] = useState<Array<{ id: string; name: string }>>([])
  const [albums, setAlbums] = useState<Album[]>([])

  const seedAlbums = useMemo(
    () =>
      SEED_ALBUMS.map((seed) => ({
        id: createId('album'),
        name: seed.name,
        ownerPlayerId: 'seed',
        songs: seed.songs.map((song) => ({ ...song, id: createId('song') })),
      })),
    [],
  )

  function addPlayer() {
    const name = playerName.trim()
    if (!name) return
    setPlayers((current) => [...current, { id: createId('player'), name }])
    setPlayerName('')
  }

  function removePlayer(id: string) {
    setPlayers((current) => current.filter((player) => player.id !== id))
  }

  function loadSeedAlbums() {
    setAlbums(seedAlbums)
  }

  function startGame() {
    if (players.length < 2 || albums.length === 0) return
    const game = createGame(players, albums)
    navigate('/local/play', { state: { game } })
  }

  const totalSongs = albums.reduce((sum, album) => sum + album.songs.length, 0)

  return (
    <div className="stack">
      <h1 className="page-title">Local Setup</h1>
      <p className="page-subtitle">Add players and albums, then start the game.</p>

      <div className="card-panel stack">
        <h3 className="card-title">Players</h3>
        <div className="inline-form">
          <input
            className="input"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="Player name"
            onKeyDown={(event) => event.key === 'Enter' && addPlayer()}
          />
          <button type="button" className="btn btn-primary" onClick={addPlayer}>
            Add Player
          </button>
        </div>
        <ul className="scoreboard-list">
          {players.map((player) => (
            <li key={player.id}>
              <span>{player.name}</span>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => removePlayer(player.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="card-panel stack">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title" style={{ margin: 0 }}>Albums</h3>
          <button type="button" className="btn btn-secondary" onClick={loadSeedAlbums}>
            Load Demo Albums
          </button>
        </div>
        <AlbumPicker
          ownerPlayerId={players[0]?.id ?? 'host'}
          albums={albums}
          onChange={setAlbums}
        />
        <p className="muted">{totalSongs} songs from {albums.length} albums</p>
      </div>

      <div className="row centered">
        <Link to="/" className="btn btn-ghost">Back</Link>
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={startGame}
          disabled={players.length < 2 || albums.length === 0}
        >
          Start Game
        </button>
      </div>
    </div>
  )
}
