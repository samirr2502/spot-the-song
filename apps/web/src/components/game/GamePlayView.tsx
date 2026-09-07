import { Link } from 'react-router-dom'
import type { GameState } from '@spot-the-song/game-engine'
import { getCardZones, getSongById } from '@spot-the-song/game-engine'
import type { DropZone, PlacementDragSource } from '../../hooks/usePlacementDrag'
import type { RevealStage } from '../../hooks/useRevealSequence'
import AudioGate from '../AudioGate'
import AudioPlayer from '../AudioPlayer'
import GameCardZones from '../GameCardZones'
import GuessInput from '../GuessInput'
import PlayerList from '../PlayerList'
import Scoreboard from '../Scoreboard'
import TurnBanner from '../TurnBanner'
import TimelineBoard, { PlayerCollections } from '../TimelineBoard'
import OutcomeBanner from './OutcomeBanner'
import PhaseActionBar from './PhaseActionBar'
import RevealCeremony from './RevealCeremony'

export type GamePlayActions = {
  onGuess: (guess: string) => void
  onConfirmPlacement: () => void
  onChallenge: (playerId: string) => void
  onReveal: () => void
  onAdvance: () => void
}

type GamePlayViewProps = {
  game: GameState
  mode: 'local' | 'online'
  now: number
  audioUnlocked: boolean
  onAudioUnlock: () => void
  revealStage: RevealStage
  error?: string | null
  isMyTurn?: boolean
  isHost?: boolean
  localPlayerId?: string
  currentSong?: {
    title: string
    artist: string
    album: string
    audioUrl: string
    releaseYear?: number
  }
  selectedInsertIndex: number | null
  onSelectInsertIndex: (index: number | null) => void
  isDragging: boolean
  dragSource: PlacementDragSource | null
  pointer: { x: number; y: number }
  hoverInsertIndex: number | null
  hoverDropZone: DropZone | null
  startHeroDrag?: (event: React.PointerEvent<HTMLDivElement>) => void
  startTimelineDrag?: (event: React.PointerEvent<HTMLDivElement>) => void
  actions: GamePlayActions
  onReplayAudio?: () => void
}

export default function GamePlayView({
  game,
  mode,
  now,
  audioUnlocked,
  onAudioUnlock,
  revealStage,
  error,
  isMyTurn = true,
  isHost = true,
  localPlayerId,
  currentSong,
  selectedInsertIndex,
  onSelectInsertIndex,
  isDragging,
  dragSource,
  pointer,
  hoverInsertIndex,
  hoverDropZone,
  startHeroDrag,
  startTimelineDrag,
  actions,
  onReplayAudio,
}: GamePlayViewProps) {
  const zones = getCardZones(game)
  const hasGuessed = game.currentTurn?.guess !== undefined
  const activePlayerId = game.currentTurn?.activePlayerId ?? ''
  const canGuess =
    (game.phase === 'playing' || game.phase === 'challenge') &&
    (mode === 'local' || isMyTurn) &&
    audioUnlocked
  const canPlace = game.phase === 'playing' && (mode === 'local' || isMyTurn) && audioUnlocked
  const cardPlacedOnTimeline = selectedInsertIndex !== null
  const showTopOnStack =
    Boolean(zones.active) &&
    !(isDragging && dragSource === 'hero') &&
    (game.phase === 'challenge' ||
      (game.phase === 'playing' && selectedInsertIndex === null))

  const engineSong = game.currentTurn
    ? getSongById(game, game.currentTurn.currentSongId)
    : undefined
  const songForDisplay = currentSong ?? engineSong

  return (
    <div className="game-board">
      <TurnBanner game={game} now={now} />

      {error && <div className="alert error">{error}</div>}

      <AudioGate unlocked={audioUnlocked} onUnlock={onAudioUnlock} />

      <RevealCeremony stage={revealStage}>
        <GameCardZones
          game={game}
          showTopCard={showTopOnStack}
          hasGuessed={hasGuessed}
          revealStage={revealStage}
          draggable={canPlace && !cardPlacedOnTimeline}
          isDragging={isDragging}
          dragSource={dragSource}
          pointer={pointer}
          hoverDropZone={hoverDropZone}
          onTopDragStart={canPlace && !cardPlacedOnTimeline ? startHeroDrag : undefined}
        />
      </RevealCeremony>

      <div className="audio-controls">
        <AudioPlayer
          audioUrl={songForDisplay?.audioUrl ?? null}
          playing={
            (game.phase === 'playing' || game.phase === 'challenge') && audioUnlocked
          }
        />
        {onReplayAudio && audioUnlocked && songForDisplay?.audioUrl && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onReplayAudio}>
            Replay clip
          </button>
        )}
      </div>

      {(game.phase === 'playing' || game.phase === 'challenge') &&
        (mode === 'local' || isMyTurn) && (
          <GuessInput
            disabled={!canGuess}
            alreadyGuessed={hasGuessed}
            onSubmit={actions.onGuess}
          />
        )}

      {game.phase === 'playing' && (mode === 'local' || isMyTurn) && (
        <div
          className={[
            'card-panel stack placement-panel card-drop-zone',
            hoverDropZone === 'timeline' ? 'card-drop-zone--active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          data-drop-zone="timeline"
        >
          <TimelineBoard
            game={game}
            playerId={activePlayerId}
            interactive
            hasGuessed={hasGuessed}
            revealStage={revealStage}
            hoverInsertIndex={hoverInsertIndex}
            pendingInsertIndex={selectedInsertIndex}
            onSelectInsertIndex={onSelectInsertIndex}
            pendingSong={
              songForDisplay
                ? {
                    title: songForDisplay.title,
                    artist: songForDisplay.artist,
                    album: songForDisplay.album,
                    releaseYear: songForDisplay.releaseYear,
                  }
                : null
            }
            isDragging={isDragging}
            dragSource={dragSource}
            onPendingDragStart={cardPlacedOnTimeline ? startTimelineDrag : undefined}
          />
          <button
            type="button"
            className="btn btn-primary placement-confirm-btn"
            disabled={selectedInsertIndex === null}
            onClick={actions.onConfirmPlacement}
          >
            Confirm placement
          </button>
        </div>
      )}

      {game.phase === 'reveal' && game.lastClaimResolution && (
        <OutcomeBanner game={game} />
      )}

      {game.phase === 'finished' && (
        <div className="centered row game-finished-actions">
          {mode === 'local' && (
            <Link to="/local/setup" className="btn btn-primary btn-lg">
              Play again
            </Link>
          )}
          <Link to="/" className="btn btn-ghost btn-lg">
            Home
          </Link>
        </div>
      )}

      <PlayerCollections game={game} activePlayerId={activePlayerId} />

      <div className="row game-board-stats">
        <div style={{ flex: 1 }}>
          <PlayerList players={game.players} activePlayerId={activePlayerId} />
        </div>
        <div style={{ flex: 1 }}>
          <Scoreboard game={game} />
        </div>
      </div>

      <PhaseActionBar
        game={game}
        mode={mode}
        isMyTurn={isMyTurn}
        isHost={isHost}
        selectedInsertIndex={selectedInsertIndex}
        onConfirmPlacement={actions.onConfirmPlacement}
        onChallenge={actions.onChallenge}
        onReveal={actions.onReveal}
        onAdvance={actions.onAdvance}
        challengerPlayerId={localPlayerId}
      />
    </div>
  )
}
