import { type CSSProperties } from 'react'
import type { RoundPhase } from '@spot-the-song/shared'
import { SketchButton } from './sketch'
import { useOptionalSpotifyPlayback } from '../context/SpotifyPlaybackContext'

type RoundClipPlayerProps = {
  isHost: boolean
  phase?: RoundPhase
  clipDurationSeconds: number
  endsAt: number | null
  secondsRemaining: number
}

export function RoundClipPlayer({
  isHost,
  phase,
  clipDurationSeconds,
  endsAt,
  secondsRemaining,
}: RoundClipPlayerProps) {
  const spotifyPlayback = useOptionalSpotifyPlayback()
  const showClip = phase === 'round-intro' || phase === 'clip-playing'
  if (!showClip) return null

  const elapsed =
    endsAt !== null && clipDurationSeconds > 0
      ? Math.max(0, clipDurationSeconds - secondsRemaining)
      : 0
  const progress = clipDurationSeconds > 0 ? elapsed / clipDurationSeconds : 0

  const playbackState = spotifyPlayback?.playbackState ?? 'idle'
  const isPlaying = phase === 'clip-playing' && playbackState === 'playing'

  const waveLabel = isHost
    ? isPlaying
      ? '♪ Playing on Spotify'
      : playbackState === 'error'
        ? '♪ Spotify error'
        : phase === 'clip-playing'
          ? '♪ Starting Spotify…'
          : '♪ Get ready…'
    : '♪ Listen…'

  const statusLabel = isHost
    ? isPlaying
      ? `${Math.floor(elapsed)}s / ${clipDurationSeconds}s`
      : playbackState === 'error'
        ? "Couldn't start Spotify playback."
        : phase === 'clip-playing'
          ? 'Connecting to Spotify…'
          : 'Clip starting soon…'
    : `${Math.max(0, secondsRemaining)}s left`

  return (
    <div className="clip-player" aria-label="Song clip">
      <div
        className={`clip-player__wave clip-player__wave--${isPlaying ? 'playing' : playbackState === 'error' ? 'error' : 'idle'}`}
        style={{ '--clip-progress': progress } as CSSProperties}
      >
        {waveLabel}
      </div>
      <p className={`clip-player__status clip-player__status--${isPlaying ? 'playing' : playbackState}`} aria-live="polite">
        {statusLabel}
      </p>
      {isHost && playbackState === 'error' ? (
        <div className="clip-player__actions">
          <SketchButton type="button" variant="ghost" fullWidth onClick={() => void spotifyPlayback?.retryPlayback()}>
            Try again
          </SketchButton>
        </div>
      ) : null}
      {isHost && !spotifyPlayback?.playerInitialized && phase !== 'round-intro' ? (
        <p className="clip-player__hint">Spotify Premium may be required for playback.</p>
      ) : null}
      {!isHost ? (
        <p className="clip-player__hint">Listen through the host&apos;s speakers.</p>
      ) : null}
    </div>
  )
}
