import type { PointerEvent as ReactPointerEvent } from 'react'
import type { RevealStage } from '../hooks/useRevealSequence'

export type SongCardFaceMode = 'hidden' | 'title' | 'year' | 'full'

type SongCardProps = {
  flipped?: boolean
  alwaysOpen?: boolean
  faceMode?: SongCardFaceMode
  revealStage?: RevealStage
  albumName?: string
  title?: string
  artist?: string
  showYear?: number
  isStarter?: boolean
  size?: 'hero' | 'timeline'
  draggable?: boolean
  dragging?: boolean
  ghost?: boolean
  stackLayer?: boolean
  className?: string
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void
}

function stageToFaceMode(stage: RevealStage | undefined, fallback: SongCardFaceMode): SongCardFaceMode {
  if (!stage) return fallback
  switch (stage) {
    case 'hidden':
      return 'hidden'
    case 'revealing-title':
    case 'title':
      return 'title'
    case 'revealing-year':
    case 'year':
      return 'year'
    default:
      return fallback
  }
}

export default function SongCard({
  flipped = false,
  alwaysOpen = false,
  faceMode,
  revealStage,
  albumName,
  title,
  artist,
  showYear,
  isStarter = false,
  size = 'hero',
  draggable = false,
  dragging = false,
  ghost = false,
  stackLayer = false,
  className,
  onPointerDown,
}: SongCardProps) {
  if (alwaysOpen || faceMode || revealStage) {
    const baseMode = faceMode ?? 'full'
    const mode = stageToFaceMode(revealStage, baseMode)
    const isRevealing = revealStage === 'revealing-title' || revealStage === 'revealing-year'
    const showTitle = mode === 'title' || mode === 'full' || mode === 'year'
    const showArtist = showTitle
    const showYearValue =
      (mode === 'year' || mode === 'full' || (isStarter && mode !== 'hidden')) &&
      showYear !== undefined &&
      showYear > 0
        ? showYear
        : undefined
    const displayTitle =
      title && size === 'timeline' ? truncateLabel(title, 28) : title
    const displayArtist =
      artist && size === 'timeline' ? truncateLabel(artist, 22) : artist

    return (
      <div
        className={[
          'song-card',
          'song-card--always-open',
          `song-card--${size}`,
          `song-card--face-${mode}`,
          isRevealing ? 'song-card--revealing' : '',
          stackLayer ? 'song-card--stack-layer' : '',
          draggable ? 'song-card--draggable' : '',
          dragging ? 'song-card--dragging' : '',
          ghost ? 'song-card--ghost' : '',
          isStarter ? 'song-card--starter' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        onPointerDown={onPointerDown}
      >
        <div className="song-card__inner">
          <div className="song-card__face song-card__face--open">
            {mode === 'hidden' && <span className="song-card__mark">?</span>}
            {showYearValue !== undefined && (
              <span className="song-card__year">{showYearValue}</span>
            )}
            {showTitle && displayTitle && (
              <h3 className="song-card__title" title={title}>
                {displayTitle}
              </h3>
            )}
            {showArtist && displayArtist && (
              <p className="song-card__artist" title={artist}>
                {displayArtist}
              </p>
            )}
            {isStarter && mode !== 'hidden' && (
              <span className="song-card__badge">Starter</span>
            )}
            {albumName && size === 'hero' && mode === 'hidden' && (
              <span className="song-card__album">{albumName}</span>
            )}
          </div>
        </div>
      </div>
    )
  }

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

export function getActiveCardFaceMode(
  hasGuessed: boolean,
  phase: string,
): SongCardFaceMode {
  if (hasGuessed || phase === 'challenge') return 'title'
  return 'hidden'
}

export function getTimelineCardFaceMode(
  game: { phase: string; lastClaimResolution: { songId: string; placementCorrect: boolean; guessCorrect: boolean } | null },
  songId: string,
  isStarter: boolean,
  _guessedSongIds: string[],
  revealedSongIds: string[],
): SongCardFaceMode {
  if (isStarter) return 'full'

  const isJustRevealed =
    game.phase === 'reveal' && game.lastClaimResolution?.songId === songId

  if (isJustRevealed && game.lastClaimResolution) {
    if (game.lastClaimResolution.placementCorrect) return 'year'
    return 'title'
  }

  if (revealedSongIds.includes(songId)) return 'year'

  return 'full'
}

function truncateLabel(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1).trimEnd()}…`
}
