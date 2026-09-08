import type { Track } from '@spot-the-song/shared'
import { SketchButton } from './SketchButton'
import { SketchCard } from './SketchCard'

type SketchSongCardProps = {
  track: Pick<Track, 'title' | 'artist' | 'album' | 'year'> & { spotifyUrl?: string }
  hiddenYear?: boolean
  compact?: boolean
  showSpotifyLink?: boolean
  jamHint?: boolean
}

export function SketchSongCard({
  track,
  hiddenYear,
  compact,
  showSpotifyLink = false,
  jamHint = false,
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
          <>
            <SketchButton
              variant="ghost"
              fullWidth
              onClick={() => window.open(track.spotifyUrl, '_blank', 'noopener,noreferrer')}
            >
              Play full song on Spotify ↗
            </SketchButton>
            {jamHint ? (
              <p className="clip-player__hint">Jam it before the next round.</p>
            ) : null}
          </>
        ) : null}
      </div>
    </SketchCard>
  )
}
