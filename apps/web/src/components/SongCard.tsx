import type { PointerEvent as ReactPointerEvent } from 'react'

type SongCardProps = {
  flipped?: boolean
  albumName?: string
  title?: string
  artist?: string
  showYear?: number
  isStarter?: boolean
  size?: 'hero' | 'timeline'
  draggable?: boolean
  dragging?: boolean
  ghost?: boolean
  className?: string
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void
}

export default function SongCard({
  flipped = false,
  albumName,
  title,
  artist,
  showYear,
  isStarter = false,
  size = 'hero',
  draggable = false,
  dragging = false,
  ghost = false,
  className,
  onPointerDown,
}: SongCardProps) {
  return (
    <div
      className={[
        'song-card',
        `song-card--${size}`,
        flipped ? 'song-card--flipped' : '',
        dragging ? 'song-card--dragging' : '',
        draggable ? 'song-card--draggable' : '',
        ghost ? 'song-card--ghost' : '',
        isStarter ? 'song-card--starter' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onPointerDown={onPointerDown}
    >
      <div className="song-card__inner">
        <div className="song-card__face song-card__face--front">
          {showYear === undefined && <span className="song-card__mark">?</span>}
          {albumName && size === 'hero' && (
            <span className="song-card__album">{albumName}</span>
          )}
          {showYear !== undefined && (
            <span className="song-card__year">{showYear}</span>
          )}
          {isStarter && <span className="song-card__badge">Starter</span>}
        </div>
        <div className="song-card__face song-card__face--back">
          <h3 className="song-card__title">{title}</h3>
          <p className="song-card__artist">{artist}</p>
        </div>
      </div>
    </div>
  )
}
