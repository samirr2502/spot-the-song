import { useEffect, useReducer, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { GameState } from '@spot-the-song/game-engine'
import {
  gameReducer,
  getSongById,
  isTimerExpired,
  startGame,
} from '@spot-the-song/game-engine'
import AudioGate from '../components/AudioGate'
import AudioPlayer from '../components/AudioPlayer'
import FlipCard from '../components/FlipCard'
import GuessInput from '../components/GuessInput'
import PlayerList from '../components/PlayerList'
import Scoreboard from '../components/Scoreboard'
import TurnBanner from '../components/TurnBanner'

export default function LocalPlay() {
  const location = useLocation()
  const navigate = useNavigate()
  const initialGame = (location.state as { game?: GameState } | null)?.game

  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [game, dispatch] = useReducer(
    gameReducer,
    initialGame,
    (lobbyGame) => (lobbyGame ? startGame(lobbyGame) : null as unknown as GameState),
  )

  useEffect(() => {
    if (!initialGame) {
      navigate('/local/setup', { replace: true })
    }
  }, [initialGame, navigate])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!game || game.phase !== 'playing') return
    if (isTimerExpired(game, now)) {
      dispatch({ type: 'TIMEOUT' })
    }
  }, [game, now])

  if (!game) return null

  const currentSong = game.currentTurn
    ? getSongById(game, game.currentTurn.currentSongId)
    : undefined

  const flipped = game.phase === 'reveal' || game.phase === 'finished'
  const canGuess = game.phase === 'playing' && audioUnlocked

  return (
    <div className="game-board">
      <TurnBanner game={game} now={now} />

      <AudioGate unlocked={audioUnlocked} onUnlock={() => setAudioUnlocked(true)} />

      <FlipCard
        flipped={flipped}
        albumName={currentSong?.album}
        title={currentSong?.title}
        artist={currentSong?.artist}
      />

      <AudioPlayer
        audioUrl={currentSong?.audioUrl ?? null}
        playing={game.phase === 'playing' && audioUnlocked}
      />

      {game.phase === 'playing' && (
        <GuessInput
          disabled={!canGuess}
          onSubmit={(guess) => dispatch({ type: 'SUBMIT_GUESS', guess })}
        />
      )}

      {game.phase === 'reveal' && (
        <div className="centered">
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={() => dispatch({ type: 'ADVANCE_TURN' })}
          >
            Next Turn
          </button>
        </div>
      )}

      {game.phase === 'finished' && (
        <div className="centered row">
          <Link to="/local/setup" className="btn btn-primary btn-lg">
            Play Again
          </Link>
          <Link to="/" className="btn btn-ghost btn-lg">
            Home
          </Link>
        </div>
      )}

      <div className="row" style={{ gap: 'var(--space-xl)' }}>
        <div style={{ flex: 1 }}>
          <h3 className="card-title">Players</h3>
          <PlayerList
            players={game.players}
            activePlayerId={game.currentTurn?.activePlayerId}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Scoreboard game={game} />
        </div>
      </div>
    </div>
  )
}
