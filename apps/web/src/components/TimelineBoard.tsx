import { useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { GameState } from '@spot-the-song/game-engine'
import { getSongById } from '@spot-the-song/game-engine'
import type { RevealStage } from '../hooks/useRevealSequence'
import type { PlacementDragSource } from '../hooks/usePlacementDrag'
import SongCard, { getActiveCardFaceMode, getTimelineCardFaceMode } from './SongCard'

type TimelineCardProps = {
  song: { title: string; artist: string; releaseYear: number }
  isStarter: boolean
  faceMode: ReturnType<typeof getTimelineCardFaceMode>
}

function TimelineCard({ song, isStarter, faceMode }: TimelineCardProps) {
  return (
    <SongCard
      size="timeline"
      alwaysOpen
      faceMode={faceMode}
      title={song.title}
      artist={song.artist}
      showYear={song.releaseYear}
      isStarter={isStarter}
    />
  )
}

type TimelineBoardProps = {
  game: GameState
  playerId: string
  interactive?: boolean
  hasGuessed?: boolean
  revealStage?: RevealStage
  hoverInsertIndex?: number | null
  pendingInsertIndex?: number | null
  onSelectInsertIndex?: (insertIndex: number) => void
  pendingSong?: { title: string; artist: string; album: string; releaseYear?: number } | null
  isDragging?: boolean
  dragSource?: PlacementDragSource | null
  onPendingDragStart?: (event: ReactPointerEvent<HTMLDivElement>) => void
}

type InsertSlotProps = {
  insertIndex: number
  interactive: boolean
  isOpen: boolean
  hasPendingCard: boolean
  pendingFaceMode: ReturnType<typeof getActiveCardFaceMode>
  revealStage?: RevealStage
  pendingSong?: { title: string; artist: string; album: string; releaseYear?: number }
  onSelect: (insertIndex: number) => void
  onPendingDragStart?: (event: ReactPointerEvent<HTMLDivElement>) => void
}

function InsertSlot({
  insertIndex,
  interactive,
  isOpen,
  hasPendingCard,
  pendingFaceMode,
  revealStage,
  pendingSong,
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
          alwaysOpen
          faceMode={pendingFaceMode}
          revealStage={revealStage}
          title={pendingSong.title}
          artist={pendingSong.artist}
          showYear={pendingSong.releaseYear}
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
  hasGuessed = false,
  revealStage,
  hoverInsertIndex = null,
  pendingInsertIndex = null,
  onSelectInsertIndex,
  pendingSong = null,
  isDragging = false,
  dragSource = null,
  onPendingDragStart,
}: TimelineBoardProps) {
  const board = game.boards[playerId]
  if (!board) return null

  const pendingFaceMode = getActiveCardFaceMode(hasGuessed, game.phase)

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
    pendingFaceMode,
    revealStage,
    pendingSong: pendingSong ?? undefined,
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
          const faceMode = getTimelineCardFaceMode(
            game,
            songId,
            isStarter,
            board.guessedSongIds ?? [],
            board.revealedSongIds ?? [],
          )

          return (
            <div key={`${songId}-${cardIndex}`} className="timeline-row-segment">
              <TimelineCard isStarter={isStarter} song={song} faceMode={faceMode} />
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
  const [expandedId, setExpandedId] = useState(activePlayerId ?? game.players[0]?.id ?? '')

  return (
    <div className="collections-grid collections-grid--accordion">
      <div className="collections-tabs">
        {game.players.map((player) => (
          <button
            key={player.id}
            type="button"
            className={[
              'collections-tab',
              expandedId === player.id ? 'collections-tab--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => setExpandedId(player.id)}
          >
            {player.name}
            {player.id === activePlayerId && ' ·'}
          </button>
        ))}
      </div>
      {game.players.map((player) => (
        <div
          key={player.id}
          className={[
            'collection-panel',
            expandedId === player.id ? 'collection-panel--expanded' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
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
