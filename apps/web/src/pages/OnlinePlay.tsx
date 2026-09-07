import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { GameState } from '@spot-the-song/game-engine'
import { isGuessCorrect, isTimerExpired } from '@spot-the-song/game-engine'
import AudioGate from '../components/AudioGate'
import AudioPlayer from '../components/AudioPlayer'
import FlipCard from '../components/FlipCard'
import GuessInput from '../components/GuessInput'
import PlayerList from '../components/PlayerList'
import Scoreboard from '../components/Scoreboard'
import TurnBanner from '../components/TurnBanner'
import {
  advanceOnlineTurn,
  fetchRoomState,
  mapSongsToLookup,
  submitOnlineGuess,
  subscribeToRoom,
} from '../lib/onlineGame'
import { getPlayerSessionId } from '../lib/supabase'

export default function OnlinePlay() {
  const { roomId = '' } = useParams()
  const playerId = getPlayerSessionId()
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [gameView, setGameView] = useState<GameState | null>(null)
  const [turnId, setTurnId] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timeoutSubmittedRef = useRef(false)

  const loadState = useCallback(async () => {
    if (!roomId) return
    try {
      const state = await fetchRoomState(roomId)
      const songLookup = mapSongsToLookup(state.songs, state.albums)
      const currentSong = state.currentTurn
        ? songLookup[state.currentTurn.song_id]
        : undefined

      const guessTimeSeconds = state.room.settings?.guessTimeSeconds ?? 30
      const startedAt = state.currentTurn
        ? new Date(state.currentTurn.started_at).getTime()
        : Date.now()

      const mapped: GameState = {
        id: state.room.id,
        phase: state.room.phase,
        players: state.players.map((player) => ({
          id: player.player_id,
          name: player.name,
          score: player.score,
          order: player.turn_order,
        })),
        albums: [],
        deck: state.deck.filter((card) => !card.played).map((card) => card.song_id),
        playedSongIds: state.deck.filter((card) => card.played).map((card) => card.song_id),
        currentTurn: state.currentTurn
          ? {
              activePlayerId: state.currentTurn.active_player_id,
              currentSongId: state.currentTurn.song_id,
              startedAt,
              guessDeadline: startedAt + guessTimeSeconds * 1000,
              guess: state.currentTurn.guess ?? undefined,
              isCorrect: state.currentTurn.is_correct ?? undefined,
            }
          : null,
        turnHistory: [],
        settings: { guessTimeSeconds },
        activePlayerIndex: state.players.findIndex(
          (player) => player.player_id === state.currentTurn?.active_player_id,
        ),
      }

      if (currentSong) {
        mapped.albums = [
          {
            id: 'online',
            name: currentSong.album,
            ownerPlayerId: 'online',
            songs: [currentSong],
          },
        ]
      }

      setGameView(mapped)
      setTurnId(state.currentTurn?.id ?? null)
      setIsHost(state.room.host_player_id === playerId)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game')
    }
  }, [playerId, roomId])

  useEffect(() => {
    void loadState()
    const unsubscribe = subscribeToRoom(roomId, () => {
      void loadState()
    })
    return unsubscribe
  }, [loadState, roomId])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    timeoutSubmittedRef.current = false
  }, [turnId])

  const currentSong = useMemo(() => {
    if (!gameView?.currentTurn) return undefined
    return gameView.albums[0]?.songs.find(
      (song) => song.id === gameView.currentTurn?.currentSongId,
    )
  }, [gameView])

  const handleGuess = useCallback(
    async (guess: string) => {
      if (!gameView?.currentTurn || !roomId || !turnId || !currentSong) return

      const correct = isGuessCorrect(guess, currentSong.title, currentSong.artist)
      try {
        await submitOnlineGuess(
          roomId,
          turnId,
          gameView.currentTurn.activePlayerId,
          guess,
          correct,
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit guess')
      }
    },
    [currentSong, gameView, roomId, turnId],
  )

  useEffect(() => {
    if (!gameView || gameView.phase !== 'playing') return
    if (gameView.currentTurn?.activePlayerId !== playerId) return
    if (!isTimerExpired(gameView, now)) return
    if (timeoutSubmittedRef.current) return

    timeoutSubmittedRef.current = true
    void handleGuess('')
  }, [gameView, handleGuess, now, playerId])

  async function handleAdvance() {
    if (!roomId) return
    try {
      await advanceOnlineTurn(roomId, playerId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to advance turn')
    }
  }

  if (!gameView) {
    return <p className="muted centered">Loading game...</p>
  }

  const isMyTurn = gameView.currentTurn?.activePlayerId === playerId
  const flipped = gameView.phase === 'reveal' || gameView.phase === 'finished'
  const canGuess = gameView.phase === 'playing' && isMyTurn && audioUnlocked

  return (
    <div className="game-board">
      <TurnBanner game={gameView} now={now} />
      {error && <div className="alert error">{error}</div>}

      <AudioGate unlocked={audioUnlocked} onUnlock={() => setAudioUnlocked(true)} />

      <FlipCard
        flipped={flipped}
        albumName={currentSong?.album}
        title={currentSong?.title}
        artist={currentSong?.artist}
      />

      <AudioPlayer
        audioUrl={currentSong?.audioUrl ?? null}
        playing={gameView.phase === 'playing' && audioUnlocked}
      />

      {gameView.phase === 'playing' && isMyTurn && (
        <GuessInput disabled={!canGuess} onSubmit={handleGuess} />
      )}

      {gameView.phase === 'playing' && !isMyTurn && (
        <p className="muted centered">Waiting for the active player to guess...</p>
      )}

      {gameView.phase === 'reveal' && isHost && (
        <div className="centered">
          <button type="button" className="btn btn-primary btn-lg" onClick={handleAdvance}>
            Next Turn
          </button>
        </div>
      )}

      {gameView.phase === 'reveal' && !isHost && (
        <p className="muted centered">Waiting for host to advance...</p>
      )}

      {gameView.phase === 'finished' && (
        <div className="centered row">
          <Link to="/" className="btn btn-primary btn-lg">Home</Link>
        </div>
      )}

      <div className="row" style={{ gap: 'var(--space-xl)' }}>
        <div style={{ flex: 1 }}>
          <h3 className="card-title">Players</h3>
          <PlayerList
            players={gameView.players}
            activePlayerId={gameView.currentTurn?.activePlayerId}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Scoreboard game={gameView} />
        </div>
      </div>
    </div>
  )
}
