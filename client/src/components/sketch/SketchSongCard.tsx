import type { Track } from '@spot-the-song/shared'
import { SketchCard } from './SketchCard'

type SketchSongCardProps = {
  track: Pick<Track, 'title' | 'artist' | 'album' | 'year'>
  hiddenYear?: boolean
  compact?: boolean
}

export function SketchSongCard({ track, hiddenYear, compact }: SketchSongCardProps) {
  return (
    <SketchCard className={`sketch-song-card${compact ? ' sketch-song-card--compact' : ''}`} tiltSeed={track.title}>
      <div className="sketch-song-card__art" aria-hidden>
        ♪
      </div>
      <div className="sketch-song-card__meta">
        <p className="sketch-song-card__title">{track.title}</p>
        <p className="sketch-song-card__artist">{track.artist}</p>
        {!compact ? <p className="sketch-song-card__album">{track.album}</p> : null}
        {!hiddenYear ? (
          <p className="sketch-song-card__year">{track.year}</p>
        ) : (
          <p className="sketch-song-card__year sketch-song-card__year--hidden">????</p>
        )}
      </div>
    </SketchCard>
  )
}
