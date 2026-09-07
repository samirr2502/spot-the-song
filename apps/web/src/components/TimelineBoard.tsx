import { useEffect, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { GameState } from '@spot-the-song/game-engine'
import {
  CHALLENGE_COST,
  describeInsertPosition,
  getSongById,
} from '@spot-the-song/game-engine'
import type { PlacementDragSource } from '../hooks/usePlacementDrag'
import SongCard from './SongCard'

type TimelineCardProps = {
  game: GameState
  songId: string
  isStarter: boolean
  isRevealed: boolean
  song: { title: string; artist: string; album: string; releaseYear: number }
}

function TimelineCard({ game, songId, isStarter, isRevealed, song }: TimelineCardProps) {
  const isJustRevealed =
    game.phase === 'reveal' && game.lastClaimResolution?.songId === songId && isRevealed
  const [hasFlipped, setHasFlipped] = useState(!isJustRevealed)

  useEffect(() => {
    if (!isJustRevealed) {
      setHasFlipped(true)
      return
    }

    setHasFlipped(false)
    const timer = window.setTimeout(() => setHasFlipped(true), 500)
    return () => window.clearTimeout(timer)
  }, [isJustRevealed, songId])

  const flipped = isRevealed && hasFlipped
  const showYear =
    isJustRevealed && !hasFlipped
      ? song.releaseYear
      : isStarter && !flipped
        ? song.releaseYear
        : undefined

  return (
    <SongCard
      size="timeline"
      flipped={flipped}
      albumName={song.album}
      title={song.title}
      artist={song.artist}
      showYear={showYear}
      isStarter={isStarter}
    />
  )
}

type TimelineBoardProps = {
  game: GameState
  playerId: string
  interactive?: boolean
  hoverInsertIndex?: number | null
  pendingInsertIndex?: number | null
  onSelectInsertIndex?: (insertIndex: number) => void
  pendingSong?: { title: string; artist: string; album: string } | null
  pendingFlipped?: boolean
  isDragging?: boolean
  dragSource?: PlacementDragSource | null
  onPendingDragStart?: (event: ReactPointerEvent<HTMLDivElement>) => void
}

type InsertSlotProps = {
  insertIndex: number
  interactive: boolean
  isOpen: boolean
  hasPendingCard: boolean
  pendingSong?: { title: string; artist: string; album: string }
  pendingFlipped?: boolean
  onSelect: (insertIndex: number) => void
  onPendingDragStart?: (event: ReactPointerEvent<HTMLDivElement>) => void
}

function InsertSlot({
  insertIndex,
  interactive,
  isOpen,
  hasPendingCard,
  pendingSong,
  pendingFlipped = false,
  onSelect,
  onPendingDragStart,
}: InsertSlotProps) {
  return (
    <div
      className={[
        'timeline-insert-slot',
        interactive ? 'timeline-insert-slot--interactive' : '',
        isOpen ? 'timeline-insert-slot--open' : '',
        hasPendingCard ? 'timeline-insert-slot--placed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-insert-index={insertIndex}
      onClick={() => {
        if (!interactive) return
        onSelect(insertIndex)
      }}
      aria-label={`Insert at position ${insertIndex + 1}`}
    >
      {hasPendingCard && pendingSong && (
        <SongCard
          size="timeline"
          flipped={pendingFlipped}
          albumName={pendingSong.album}
          title={pendingSong.title}
          artist={pendingSong.artist}
          draggable
          onPointerDown={(event) => {
            event.stopPropagation()
            onPendingDragStart?.(event)
          }}
        />
      )}
    </div>
  )
}

export default function TimelineBoard({
  game,
  playerId,
  interactive = false,
  hoverInsertIndex = null,
  pendingInsertIndex = null,
  onSelectInsertIndex,
  pendingSong = null,
  pendingFlipped = false,
  isDragging = false,
  dragSource = null,
  onPendingDragStart,
}: TimelineBoardProps) {
  const board = game.boards[playerId]
  if (!board) return null

  function slotIsOpen(insertIndex: number): boolean {
    if (pendingInsertIndex === insertIndex) return true
    if (isDragging && hoverInsertIndex === insertIndex) return true
    return false
  }

  function hasPendingCard(insertIndex: number): boolean {
    return (
      pendingInsertIndex === insertIndex &&
      pendingSong !== null &&
      !(isDragging && dragSource === 'timeline')
    )
  }

  function handleSelect(insertIndex: number) {
    onSelectInsertIndex?.(insertIndex)
  }

  const slotProps = {
    interactive,
    pendingSong: pendingSong ?? undefined,
    pendingFlipped,
    onSelect: handleSelect,
    onPendingDragStart,
  }

  return (
    <div className="timeline-board">
      <div className="timeline-header">
        <span className="timeline-title">Timeline</span>
        <span className="timeline-meta">{board.coins} coins</span>
      </div>

      <div
        className={['timeline-row', interactive ? 'timeline-row--interactive' : '']
          .filter(Boolean)
          .join(' ')}
      >
        <InsertSlot
          insertIndex={0}
          isOpen={slotIsOpen(0)}
          hasPendingCard={hasPendingCard(0)}
          {...slotProps}
        />

        {board.cards.map((songId, cardIndex) => {
          const song = getSongById(game, songId)
          if (!song) return null

          const insertIndex = cardIndex + 1
          const isStarter = songId === board.starterSongId
          const isRevealed = board.revealedSongIds.includes(songId)

          return (
            <div key={`${songId}-${cardIndex}`} className="timeline-row-segment">
              <TimelineCard
                game={game}
                songId={songId}
                isStarter={isStarter}
                isRevealed={isRevealed}
                song={song}
              />
              <InsertSlot
                insertIndex={insertIndex}
                isOpen={slotIsOpen(insertIndex)}
                hasPendingCard={hasPendingCard(insertIndex)}
                {...slotProps}
              />
            </div>
          )
        })}
      </div>

      {board.cards.length === 0 && !interactive && (
        <p className="timeline-empty muted">No cards yet.</p>
      )}
    </div>
  )
}

type PlayerCollectionsProps = {
  game: GameState
  activePlayerId?: string
}

export function PlayerCollections({ game, activePlayerId }: PlayerCollectionsProps) {
  return (
    <div className="collections-grid">
      {game.players.map((player) => (
        <div key={player.id} className="collection-panel">
          <h4 className="collection-name">
            {player.name}
            {player.id === activePlayerId && <span className="badge">Active</span>}
          </h4>
          <TimelineBoard game={game} playerId={player.id} />
        </div>
      ))}
    </div>
  )
}

type ChallengePanelProps = {
  game: GameState
  onChallenge: (playerId: string) => void
  onReveal: () => void
  challengerPlayerId?: string
}

export function ChallengePanel({
  game,
  onChallenge,
  onReveal,
  challengerPlayerId,
}: ChallengePanelProps) {
  const claim = game.pendingClaim
  if (!claim) return null

  const claimant = game.players.find((player) => player.id === claim.claimantId)
  const claimantBoard = game.boards[claim.claimantId]
  const placementText = claimantBoard
    ? describeInsertPosition(claim.insertIndex, claimantBoard.cards.length)
    : 'on their timeline'

  const challengers = game.players.filter((player) => {
    if (player.id === claim.claimantId) return false
    if (claim.challengerId) return false
    if (challengerPlayerId && player.id !== challengerPlayerId) return false
    const board = game.boards[player.id]
    return (board?.coins ?? 0) >= CHALLENGE_COST
  })

  return (
    <div className="card-panel stack challenge-panel">
      <h3 className="card-title">Challenge Window</h3>
      <p className="muted">
        {claimant?.name} placed a card {placementText}. Spend {CHALLENGE_COST} coin to
        challenge before the release year is revealed.
      </p>
      {claim.challengerId ? (
        <p className="muted">
          Challenged by {game.players.find((player) => player.id === claim.challengerId)?.name}.
        </p>
      ) : (
        challengers.length > 0 && (
          <div className="row">
            {challengers.map((player) => (
              <button
                key={player.id}
                type="button"
                className="btn btn-secondary"
                onClick={() => onChallenge(player.id)}
              >
                {player.name} challenges ({CHALLENGE_COST} coin)
              </button>
            ))}
          </div>
        )
      )}
      <button type="button" className="btn btn-primary" onClick={onReveal}>
        Reveal Year
      </button>
    </div>
  )
}

type ClaimRevealProps = {
  game: GameState
}

export function ClaimReveal({ game }: ClaimRevealProps) {
  const resolution = game.lastClaimResolution
  if (!resolution) return null

  const song = getSongById(game, resolution.songId)
  const winner = resolution.awardedTo
    ? game.players.find((player) => player.id === resolution.awardedTo)?.name
    : null

  return (
    <div className="card-panel stack">
      <h3 className="card-title">Timeline Result</h3>
      <p>
        {song?.title} was released in <strong>{resolution.releaseYear}</strong>.
      </p>
      {resolution.discarded && (
        <p className="muted">Wrong placement and no challenge — card discarded.</p>
      )}
      {winner && (
        <p className="muted">
          {resolution.placementCorrect
            ? `${winner} keeps the card.`
            : `${winner} wins the challenge and collects the card.`}
        </p>
      )}
      {resolution.guessCorrect && (
        <p className="muted">
          +{resolution.coinsAwarded} coin for naming the song correctly.
        </p>
      )}
    </div>
  )
}
