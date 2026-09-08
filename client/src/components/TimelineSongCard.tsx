import { SketchCard } from './sketch'

type TimelineSongCardProps = {
  tiltSeed: string
  hidden?: boolean
  isStarter?: boolean
  title?: string
  artist?: string
  album?: string
  year?: number | null
  hiddenYear?: boolean
  /** Omit album line — default for timeline row cards. */
  compact?: boolean
}

export function TimelineSongCard({
  tiltSeed,
  hidden = false,
  isStarter = false,
  title,
  artist,
  album,
  year,
  hiddenYear = false,
  compact = true,
}: TimelineSongCardProps) {
  const showAlbum = !hidden && !compact && album

  return (
    <SketchCard
      tiltSeed={tiltSeed}
      className={`timeline-song-card${hidden ? ' timeline-song-card--hidden' : ''}`}
    >
      <span className="timeline-song-card__icon" aria-hidden>♪</span>
      <div className="timeline-song-card__body">
        {hidden ? (
          <>
            <p className="timeline-song-card__eyebrow">{isStarter ? 'starter' : 'hidden'}</p>
            <p className="timeline-song-card__title">???</p>
            <p className="timeline-song-card__year timeline-song-card__year--hidden">????</p>
          </>
        ) : (
          <>
            {title ? <p className="timeline-song-card__title">{title}</p> : null}
            {artist ? <p className="timeline-song-card__artist">{artist}</p> : null}
            {showAlbum ? <p className="timeline-song-card__album">{album}</p> : null}
            {hiddenYear ? (
              <p className="timeline-song-card__year timeline-song-card__year--hidden">????</p>
            ) : (
              <p className="timeline-song-card__year">{year ?? '—'}</p>
            )}
          </>
        )}
      </div>
    </SketchCard>
  )
}
