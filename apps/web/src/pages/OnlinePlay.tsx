import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { GameState } from '@spot-the-song/game-engine'
import { isGuessCorrect, isTimerExpired, GUESS_REWARD_COINS } from '@spot-the-song/game-engine'
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
import {
  advanceOnlineTurn,
  buildBoardsFromTimeline,
  fetchRoomState,
  mapSongsToLookup,
  revealOnlineClaim,
  submitOnlineChallenge,
  submitOnlineGuess,
  submitOnlinePlacement,
  subscribeToRoom,
} from '../lib/onlineGame'
import { getPlayerSessionId } from '../lib/supabase'

export default function OnlinePlay() {
  const { roomId = '' } = useParams()
  const playerId = getPlayerSessionId()
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [gameView, setGameView] = useState<GameState | null>(null)
  const [songLookup, setSongLookup] = useState<ReturnType<typeof mapSongsToLookup>>({})
  const [turnId, setTurnId] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedInsertIndex, setSelectedInsertIndex] = useState<number | null>(null)
  const timeoutSubmittedRef = useRef(false)

  const loadState = useCallback(async () => {
    if (!roomId) return
    try {
      const state = await fetchRoomState(roomId)
      const lookup = mapSongsToLookup(state.songs, state.albums)
      const songs = Object.values(lookup)
      const guessTimeSeconds = state.room.settings?.guessTimeSeconds ?? 30
      const startedAt = state.currentTurn
        ? new Date(state.currentTurn.started_at).getTime()
        : Date.now()

      const mapped: GameState = {
        id: state.room.id,
        phase: state.room.phase === 'placement' ? 'playing' : state.room.phase,
        players: state.players.map((player) => ({
          id: player.player_id,
          name: player.name,
          score: player.score,
          order: player.turn_order,
        })),
        albums: songs.length
          ? [{ id: 'online', name: 'Room Songs', ownerPlayerId: 'online', songs }]
          : [],
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
        boards: buildBoardsFromTimeline(state.players, state.timelineCards),
        pendingClaim:
          state.room.phase === 'challenge' &&
          state.currentTurn &&
          (state.currentTurn.insert_index ?? state.currentTurn.claimed_slot) !== null
            ? {
                songId: state.currentTurn.song_id,
                claimantId: state.currentTurn.active_player_id,
                insertIndex:
                  state.currentTurn.insert_index ?? state.currentTurn.claimed_slot ?? 0,
                challengerId: state.currentTurn.challenger_player_id,
              }
            : null,
        lastClaimResolution:
          state.room.phase === 'reveal' &&
          state.currentTurn &&
          (state.currentTurn.insert_index ?? state.currentTurn.claimed_slot) !== null
            ? {
                songId: state.currentTurn.song_id,
                releaseYear: lookup[state.currentTurn.song_id]?.releaseYear ?? 2000,
                placementCorrect:
                  state.currentTurn.claim_awarded_to === state.currentTurn.active_player_id,
                awardedTo: state.currentTurn.claim_awarded_to,
                discarded: state.currentTurn.claim_discarded,
                challengerId: state.currentTurn.challenger_player_id,
                guessCorrect: state.currentTurn.is_correct === true,
                coinsAwarded: state.currentTurn.is_correct ? GUESS_REWARD_COINS : 0,
              }
            : null,
      }

      setGameView(mapped)
      setSongLookup(lookup)
      setTurnId(state.currentTurn?.id ?? null)
      setIsHost(state.room.host_player_id === playerId)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game')
    }
  }, [playerId, roomId])

  const { isDragging, dragSource, pointer, hoverInsertIndex, startHeroDrag, startTimelineDrag } =
    usePlacementDrag(setSelectedInsertIndex)

  useEffect(() => {
    void loadState()

    let reloadTimer: ReturnType<typeof setTimeout> | undefined
    const scheduleReload = () => {
      window.clearTimeout(reloadTimer)
      reloadTimer = window.setTimeout(() => {
        void loadState()
      }, 300)
    }

    const unsubscribe = subscribeToRoom(roomId, scheduleReload)
    return () => {
      window.clearTimeout(reloadTimer)
      unsubscribe()
    }
  }, [loadState, roomId])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    timeoutSubmittedRef.current = false
    setSelectedInsertIndex(null)
  }, [turnId, gameView?.phase])

  const currentSong = useMemo(() => {
    if (!gameView?.currentTurn) return undefined
    return songLookup[gameView.currentTurn.currentSongId]
  }, [gameView, songLookup])

  const handleGuess = useCallback(
    async (guess: string) => {
      if (!gameView?.currentTurn || !roomId || !turnId || !currentSong) return

      const correct = isGuessCorrect(guess, currentSong.title, currentSong.artist, {
        alternateTitles: currentSong.alternateTitles,
        alternateArtists: currentSong.alternateArtists,
      })
      try {
        await submitOnlineGuess(
          roomId,
          turnId,
          gameView.currentTurn.activePlayerId,
          guess,
          correct,
        )
        await loadState()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit guess')
      }
    },
    [currentSong, gameView, loadState, roomId, turnId],
  )

  useEffect(() => {
    if (!gameView || gameView.phase !== 'playing') return
    if (gameView.currentTurn?.activePlayerId !== playerId) return
    if (!isTimerExpired(gameView, now)) return
    if (timeoutSubmittedRef.current) return

    timeoutSubmittedRef.current = true
    const board = gameView.boards[playerId]
    if (!roomId || !turnId || !board) return

    void submitOnlinePlacement(
      roomId,
      turnId,
      playerId,
      selectedInsertIndex ?? board.cards.length,
    )
      .then(() => loadState())
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to auto-place card')
      })
  }, [gameView, loadState, now, playerId, roomId, turnId])

  async function handlePlacement() {
    if (!roomId || !turnId || !gameView?.currentTurn || selectedInsertIndex === null) return
    try {
      await submitOnlinePlacement(
        roomId,
        turnId,
        gameView.currentTurn.activePlayerId,
        selectedInsertIndex,
      )
      await loadState()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place card')
    }
  }

  async function handleChallenge(challengerId: string) {
    if (!roomId || !turnId) return
    try {
      await submitOnlineChallenge(roomId, turnId, challengerId)
      await loadState()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to challenge')
    }
  }

  async function handleRevealClaim() {
    if (!roomId || !turnId) return
    try {
      await revealOnlineClaim(roomId, turnId)
      await loadState()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reveal claim')
    }
  }

  async function handleAdvance() {
    if (!roomId) return
    try {
      await advanceOnlineTurn(roomId, playerId)
      await loadState()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to advance turn')
    }
  }

  if (!gameView) {
    return <p className="muted centered">Loading game...</p>
  }

  const isMyTurn = gameView.currentTurn?.activePlayerId === playerId
  const hasGuessed = gameView.currentTurn?.guess !== undefined
  const hasGuessedCorrectly = gameView.currentTurn?.isCorrect === true
  const showCardFace =
    gameView.phase === 'reveal' ||
    gameView.phase === 'finished' ||
    ((gameView.phase === 'playing' || gameView.phase === 'challenge') &&
      hasGuessedCorrectly &&
      !isDragging)
  const canGuess =
    (gameView.phase === 'playing' || gameView.phase === 'challenge') &&
    isMyTurn &&
    audioUnlocked
  const canPlace = gameView.phase === 'playing' && isMyTurn && audioUnlocked
  const activePlayerId = gameView.currentTurn?.activePlayerId ?? ''
  const cardPlacedOnTimeline = selectedInsertIndex !== null
  const showHeroPlaceholder =
    cardPlacedOnTimeline || (isDragging && dragSource === 'hero')
  const showHeroCard = canPlace && !showHeroPlaceholder

  return (
    <div className="game-board">
      <TurnBanner game={gameView} now={now} />
      {error && <div className="alert error">{error}</div>}

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
        playing={
          (gameView.phase === 'playing' || gameView.phase === 'challenge') && audioUnlocked
        }
      />

      {(gameView.phase === 'playing' || gameView.phase === 'challenge') && isMyTurn && (
        <GuessInput
          disabled={!canGuess}
          alreadyGuessed={hasGuessed}
          onSubmit={handleGuess}
        />
      )}

      {gameView.phase === 'playing' && isMyTurn && (
        <div className="card-panel stack placement-panel">
            <h3 className="card-title">Place on your timeline</h3>
            <TimelineBoard
              game={gameView}
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
              onClick={handlePlacement}
            >
              Confirm selected gap
            </button>
          </div>
      )}

      {gameView.phase === 'playing' && !isMyTurn && (
        <p className="muted centered">Waiting for the active player to place the card...</p>
      )}

      {gameView.phase === 'challenge' && (
        <ChallengePanel
          game={gameView}
          challengerPlayerId={playerId}
          onChallenge={handleChallenge}
          onReveal={handleRevealClaim}
        />
      )}

      {gameView.phase === 'reveal' && (
        <>
          {gameView.lastClaimResolution && <ClaimReveal game={gameView} />}
          {isHost ? (
            <div className="centered">
              <button type="button" className="btn btn-primary btn-lg" onClick={handleAdvance}>
                Next Turn
              </button>
            </div>
          ) : (
            <p className="muted centered">Waiting for host to advance...</p>
          )}
        </>
      )}

      {gameView.phase === 'finished' && (
        <div className="centered row">
          <Link to="/" className="btn btn-primary btn-lg">Home</Link>
        </div>
      )}

      <PlayerCollections game={gameView} activePlayerId={activePlayerId} />

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
