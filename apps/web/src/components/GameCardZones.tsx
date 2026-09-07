import { createPortal } from 'react-dom'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { GameState } from '@spot-the-song/game-engine'
import { getCardZones, getSongById } from '@spot-the-song/game-engine'
import type { RevealStage } from '../hooks/useRevealSequence'
import type { DropZone, PlacementDragSource } from '../hooks/usePlacementDrag'
import CardPile from './CardPile'
import DrawStack, { getActiveCardFaceMode } from './DrawStack'
import SongCard from './SongCard'

type GameCardZonesProps = {
  game: GameState
  showTopCard?: boolean
  hasGuessed?: boolean
  revealStage?: RevealStage
  draggable?: boolean
  isDragging?: boolean
  dragSource?: PlacementDragSource | null
  pointer?: { x: number; y: number }
  hoverDropZone?: DropZone | null
  onTopDragStart?: (event: ReactPointerEvent<HTMLDivElement>) => void
}

export default function GameCardZones({
  game,
  showTopCard = true,
  hasGuessed = false,
  revealStage,
  draggable = false,
  isDragging = false,
  dragSource = null,
  pointer = { x: 0, y: 0 },
  hoverDropZone = null,
  onTopDragStart,
}: GameCardZonesProps) {
  const zones = getCardZones(game)
  const activeSong = zones.active ? getSongById(game, zones.active) : undefined
  const faceMode = getActiveCardFaceMode(hasGuessed, game.phase)

  const topSongId =
    showTopCard && zones.active && !(isDragging && dragSource === 'hero')
      ? zones.active
      : null

  return (
    <section className="card-zones-panel stack">
      <div className="card-zones card-zones--two">
        <CardPile
          title="Discard"
          songIds={zones.discard}
          game={game}
          emptyLabel="Empty"
          dropZone="discard"
          isDropTarget={hoverDropZone === 'discard'}
          faceMode="title"
        />

        <DrawStack
          game={game}
          deckSongIds={zones.deck}
          topSongId={topSongId}
          faceMode={faceMode}
          revealStage={revealStage}
          draggable={draggable}
          dragging={isDragging && dragSource === 'hero'}
          isDropTarget={hoverDropZone === 'deck'}
          onTopDragStart={onTopDragStart}
        />
      </div>

      {isDragging &&
        activeSong &&
        createPortal(
          <div
            className={[
              'drag-floating-card',
              dragSource === 'hero' ? 'drag-floating-card--hero' : 'drag-floating-card--timeline',
              hoverDropZone ? 'drag-floating-card--compact' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ left: pointer.x, top: pointer.y }}
          >
            <SongCard
              size={dragSource === 'hero' ? 'hero' : 'timeline'}
              faceMode={faceMode}
              revealStage={revealStage}
              alwaysOpen
              title={activeSong.title}
              artist={activeSong.artist}
              showYear={activeSong.releaseYear}
            />
          </div>,
          document.body,
        )}
    </section>
  )
}
