import { useCallback, useEffect, useReducer, useState } from 'react'
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
import GuessInput from '../components/GuessInput'
import PlacementHero from '../components/PlacementHero'
import PlayerList from '../components/PlayerList'
import Scoreboard from '../components/Scoreboard'
import TurnBanner from '../components/TurnBanner'
import TimelineBoard, {
  ChallengePanel,
  ClaimReveal,
  PlayerCollections,
} from '../components/TimelineBoard'
import { usePlacementDrag } from '../hooks/usePlacementDrag'

export default function LocalPlay() {
  const location = useLocation()
  const navigate = useNavigate()
  const initialGame = (location.state as { game?: GameState } | null)?.game

  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [selectedInsertIndex, setSelectedInsertIndex] = useState<number | null>(null)
  const [game, dispatch] = useReducer(
    gameReducer,
    initialGame,
    (lobbyGame) => (lobbyGame ? startGame(lobbyGame) : null as unknown as GameState),
  )

  const handlePlace = useCallback((insertIndex: number) => {
    setSelectedInsertIndex(insertIndex)
  }, [])

  const { isDragging, dragSource, pointer, hoverInsertIndex, startHeroDrag, startTimelineDrag } =
    usePlacementDrag(handlePlace)

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

  useEffect(() => {
    setSelectedInsertIndex(null)
  }, [game?.phase, game?.currentTurn?.currentSongId])

  if (!game) return null

  const currentSong = game.currentTurn
    ? getSongById(game, game.currentTurn.currentSongId)
    : undefined

  const hasGuessed = game.currentTurn?.guess !== undefined
  const hasGuessedCorrectly = game.currentTurn?.isCorrect === true
  const showCardFace =
    game.phase === 'reveal' ||
    game.phase === 'finished' ||
    ((game.phase === 'playing' || game.phase === 'challenge') &&
      hasGuessedCorrectly &&
      !isDragging)
  const canGuess =
    (game.phase === 'playing' || game.phase === 'challenge') && audioUnlocked
  const activePlayerId = game.currentTurn?.activePlayerId ?? ''
  const canPlace = game.phase === 'playing' && audioUnlocked

  const cardPlacedOnTimeline = selectedInsertIndex !== null
  const showHeroPlaceholder =
    cardPlacedOnTimeline || (isDragging && dragSource === 'hero')
  const showHeroCard = canPlace && !showHeroPlaceholder

  function confirmPlacement() {
    if (selectedInsertIndex === null) return
    dispatch({ type: 'SUBMIT_PLACEMENT', insertIndex: selectedInsertIndex })
  }

  return (
    <div className="game-board">
      <TurnBanner game={game} now={now} />

      <AudioGate unlocked={audioUnlocked} onUnlock={() => setAudioUnlocked(true)} />

      <PlacementHero
        showCard={showHeroCard}
        showPlaceholder={showHeroPlaceholder}
        flipped={showCardFace}
        albumName={currentSong?.album}
        title={currentSong?.title}
        artist={currentSong?.artist}
        draggable={canPlace}
        isDragging={isDragging}
        dragSource={dragSource}
        pointer={pointer}
        onHeroDragStart={canPlace ? startHeroDrag : undefined}
        hint={
          canPlace
            ? cardPlacedOnTimeline
              ? 'Drag the card on your timeline to reposition, then confirm'
              : 'Drag the card between your timeline cards'
            : undefined
        }
      />

      <AudioPlayer
        audioUrl={currentSong?.audioUrl ?? null}
        playing={(game.phase === 'playing' || game.phase === 'challenge') && audioUnlocked}
      />

      {(game.phase === 'playing' || game.phase === 'challenge') && (
        <GuessInput
          disabled={!canGuess}
          alreadyGuessed={hasGuessed}
          onSubmit={(guess) => dispatch({ type: 'SUBMIT_GUESS', guess })}
        />
      )}

      {game.phase === 'playing' && (
        <>
          <div className="card-panel stack placement-panel">
            <h3 className="card-title">Place on your timeline</h3>
            <p className="muted">
              Drop the card in a gap on your row. Cards will spread apart where it will go.
            </p>
            <TimelineBoard
              game={game}
              playerId={activePlayerId}
              interactive
              hoverInsertIndex={hoverInsertIndex}
              pendingInsertIndex={selectedInsertIndex}
              onSelectInsertIndex={setSelectedInsertIndex}
              pendingSong={
                currentSong
                  ? {
                      title: currentSong.title,
                      artist: currentSong.artist,
                      album: currentSong.album,
                    }
                  : null
              }
              pendingFlipped={hasGuessedCorrectly}
              isDragging={isDragging}
              dragSource={dragSource}
              onPendingDragStart={cardPlacedOnTimeline ? startTimelineDrag : undefined}
            />
            <button
              type="button"
              className="btn btn-secondary"
              disabled={selectedInsertIndex === null}
              onClick={confirmPlacement}
            >
              Confirm selected gap
            </button>
          </div>
        </>
      )}

      {game.phase === 'challenge' && (
        <ChallengePanel
          game={game}
          onChallenge={(playerId) => dispatch({ type: 'SUBMIT_CHALLENGE', challengerId: playerId })}
          onReveal={() => dispatch({ type: 'REVEAL_CLAIM' })}
        />
      )}

      {game.phase === 'reveal' && (
        <>
          {game.lastClaimResolution && <ClaimReveal game={game} />}
          <div className="centered">
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => dispatch({ type: 'ADVANCE_TURN' })}
            >
              Next Turn
            </button>
          </div>
        </>
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

      <PlayerCollections game={game} activePlayerId={activePlayerId} />

      <div className="row" style={{ gap: 'var(--space-xl)' }}>
        <div style={{ flex: 1 }}>
          <h3 className="card-title">Players</h3>
          <PlayerList players={game.players} activePlayerId={activePlayerId} />
        </div>
        <div style={{ flex: 1 }}>
          <Scoreboard game={game} />
        </div>
      </div>
    </div>
  )
}
