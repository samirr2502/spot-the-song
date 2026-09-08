import { type CSSProperties } from 'react'
import type { PlaybackMode, RoundPhase } from '@spot-the-song/shared'
import { SketchButton } from './sketch'
import { useOptionalHostClip } from '../context/HostClipContext'
import { useOptionalSpotifyPlayback } from '../context/SpotifyPlaybackContext'

type RoundClipPlayerProps = {
  isHost: boolean
  playbackMode?: PlaybackMode
  phase?: RoundPhase
  clipDurationSeconds: number
  endsAt: number | null
  secondsRemaining: number
}

export function RoundClipPlayer({
  isHost,
  playbackMode = 'preview',
  phase,
  clipDurationSeconds,
  endsAt,
  secondsRemaining,
}: RoundClipPlayerProps) {
  const hostClip = useOptionalHostClip()
  const spotifyPlayback = useOptionalSpotifyPlayback()
  const showClip = phase === 'round-intro' || phase === 'clip-playing'
  if (!showClip) return null

  const elapsed =
    endsAt !== null && clipDurationSeconds > 0
      ? Math.max(0, clipDurationSeconds - secondsRemaining)
      : 0
  const progress = clipDurationSeconds > 0 ? elapsed / clipDurationSeconds : 0

  const isFullPlayback = playbackMode === 'spotify-full'
  const previewAudioState = hostClip?.audioState ?? 'idle'
  const playbackState = isFullPlayback ? (spotifyPlayback?.playbackState ?? 'idle') : previewAudioState
  const isPlaying =
    phase === 'clip-playing' &&
    (isFullPlayback ? playbackState === 'playing' : previewAudioState === 'playing')

  const waveLabel = isHost
    ? isPlaying
      ? isFullPlayback
        ? '♪ Playing on Spotify'
        : '♪ Playing preview'
      : playbackState === 'error'
        ? '♪ Playback error'
        : playbackState === 'muted'
          ? '♪ No preview'
          : phase === 'clip-playing'
            ? isFullPlayback
              ? '♪ Starting Spotify…'
              : '♪ Starting preview…'
            : '♪ Get ready…'
    : '♪ Listen…'

  const statusLabel = isHost
    ? isPlaying
      ? `${Math.floor(elapsed)}s / ${clipDurationSeconds}s`
      : playbackState === 'error'
        ? isFullPlayback
          ? "Couldn't start Spotify playback."
          : "Couldn't play preview."
        : playbackState === 'muted'
          ? 'No preview for this track — use Spotify link below.'
          : phase === 'clip-playing'
            ? isFullPlayback
              ? 'Connecting to Spotify…'
              : 'Loading preview…'
            : 'Clip starting soon…'
    : `${Math.max(0, secondsRemaining)}s left`

  const spotifyUrl = !isFullPlayback ? hostClip?.clipPayload?.spotifyUrl : undefined

  return (
    <div className="clip-player" aria-label="Song clip">
      <div
        className={`clip-player__wave clip-player__wave--${isPlaying ? 'playing' : playbackState === 'error' || playbackState === 'muted' ? 'error' : 'idle'}`}
        style={{ '--clip-progress': progress } as CSSProperties}
      >
        {waveLabel}
      </div>
      <p
        className={`clip-player__status clip-player__status--${isPlaying ? 'playing' : playbackState}`}
        aria-live="polite"
      >
        {statusLabel}
      </p>
      {isHost && playbackState === 'error' ? (
        <div className="clip-player__actions">
          <SketchButton
            type="button"
            variant="ghost"
            fullWidth
            onClick={() =>
              void (isFullPlayback
                ? spotifyPlayback?.retryPlayback()
                : hostClip?.retryPlayback())
            }
          >
            Try again
          </SketchButton>
        </div>
      ) : null}
      {isHost && isFullPlayback && !spotifyPlayback?.playerInitialized && phase !== 'round-intro' ? (
        <p className="clip-player__hint">Spotify Premium may be required for playback.</p>
      ) : null}
      {isHost && !isFullPlayback && previewAudioState === 'muted' && spotifyUrl ? (
        <p className="clip-player__hint">Open in Spotify to play this round — you&apos;ll see the title.</p>
      ) : null}
      {isHost && !isFullPlayback && spotifyUrl ? (
        <div className="clip-player__actions">
          <SketchButton
            type="button"
            variant="ghost"
            fullWidth
            onClick={() => window.open(spotifyUrl, '_blank', 'noopener,noreferrer')}
          >
            Open in Spotify ↗
          </SketchButton>
        </div>
      ) : null}
      {!isHost ? (
        <p className="clip-player__hint">Listen through the host&apos;s speakers.</p>
      ) : null}
    </div>
  )
}
