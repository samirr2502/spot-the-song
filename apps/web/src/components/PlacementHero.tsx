import { createPortal } from 'react-dom'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { PlacementDragSource } from '../hooks/usePlacementDrag'
import SongCard from './SongCard'

type PlacementHeroProps = {
  showCard: boolean
  showPlaceholder: boolean
  flipped: boolean
  albumName?: string
  title?: string
  artist?: string
  draggable: boolean
  isDragging: boolean
  dragSource: PlacementDragSource | null
  pointer: { x: number; y: number }
  onHeroDragStart?: (event: ReactPointerEvent<HTMLDivElement>) => void
  hint?: string
}

export default function PlacementHero({
  showCard,
  showPlaceholder,
  flipped,
  albumName,
  title,
  artist,
  draggable,
  isDragging,
  dragSource,
  pointer,
  onHeroDragStart,
  hint,
}: PlacementHeroProps) {
  return (
    <div className="placement-hero">
      {showCard ? (
        <SongCard
          size="hero"
          flipped={flipped}
          albumName={albumName}
          title={title}
          artist={artist}
          draggable={draggable}
          onPointerDown={onHeroDragStart}
        />
      ) : showPlaceholder ? (
        <div className="placement-hero-slot" aria-hidden="true" />
      ) : null}

      {isDragging &&
        dragSource === 'hero' &&
        createPortal(
          <div
            className="drag-floating-card drag-floating-card--hero"
            style={{ left: pointer.x, top: pointer.y }}
          >
            <SongCard
              size="hero"
              flipped={flipped}
              albumName={albumName}
              title={title}
              artist={artist}
            />
          </div>,
          document.body,
        )}

      {isDragging &&
        dragSource === 'timeline' &&
        createPortal(
          <div
            className="drag-floating-card drag-floating-card--timeline"
            style={{ left: pointer.x, top: pointer.y }}
          >
            <SongCard
              size="timeline"
              flipped={flipped}
              albumName={albumName}
              title={title}
              artist={artist}
            />
          </div>,
          document.body,
        )}

      {hint && <p className="placement-hero-hint">{hint}</p>}
    </div>
  )
}
