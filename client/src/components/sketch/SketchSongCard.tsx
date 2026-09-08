import type { Track } from '@spot-the-song/shared'
import { SketchButton } from './SketchButton'
import { SketchCard } from './SketchCard'

type SketchSongCardProps = {
  track: Pick<Track, 'title' | 'artist' | 'album' | 'year'> & { spotifyUrl?: string }
  hiddenYear?: boolean
  compact?: boolean
  showSpotifyLink?: boolean
}

export function SketchSongCard({
  track,
  hiddenYear,
  compact,
  showSpotifyLink = false,
}: SketchSongCardProps) {
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
          <p className="sketch-song-card__year">{track.year ?? '—'}</p>
        ) : (
          <p className="sketch-song-card__year sketch-song-card__year--hidden">????</p>
        )}
        {showSpotifyLink && track.spotifyUrl ? (
          <SketchButton
            variant="ghost"
            fullWidth
            onClick={() => window.open(track.spotifyUrl, '_blank', 'noopener,noreferrer')}
          >
            Open in Spotify ↗
          </SketchButton>
        ) : null}
      </div>
    </SketchCard>
  )
}
