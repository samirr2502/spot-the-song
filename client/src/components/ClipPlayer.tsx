import { type CSSProperties, useEffect, useRef, useState } from 'react'

type AudioState = 'idle' | 'loading' | 'playing' | 'muted' | 'error'

type ClipPlayerProps = {
  previewUrl?: string
  clipDurationSeconds: number
  playing: boolean
}

export function ClipPlayer({ previewUrl, clipDurationSeconds, playing }: ClipPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [audioState, setAudioState] = useState<AudioState>('idle')

  useEffect(() => {
    if (!playing) {
      setElapsed(0)
      setAudioState('idle')
      audioRef.current?.pause()
      audioRef.current = null
      return
    }

    if (!previewUrl) {
      setAudioState('muted')
    } else {
      setAudioState('loading')
    }

    const startedAt = Date.now()
    const interval = window.setInterval(() => {
      const next = Math.min(clipDurationSeconds, (Date.now() - startedAt) / 1000)
      setElapsed(next)
      if (next >= clipDurationSeconds) {
        audioRef.current?.pause()
      }
    }, 200)

    if (previewUrl) {
      const audio = new Audio(previewUrl)
      audioRef.current = audio

      const onPlaying = () => setAudioState('playing')
      const onError = () => setAudioState('error')

      audio.addEventListener('playing', onPlaying)
      audio.addEventListener('error', onError)

      void audio.play().catch(() => {
        setAudioState('error')
      })

      return () => {
        window.clearInterval(interval)
        audio.removeEventListener('playing', onPlaying)
        audio.removeEventListener('error', onError)
        audio.pause()
        audioRef.current = null
      }
    }

    return () => {
      window.clearInterval(interval)
    }
  }, [playing, previewUrl, clipDurationSeconds])

  const progress = clipDurationSeconds > 0 ? elapsed / clipDurationSeconds : 0

  const statusLabel =
    audioState === 'playing'
      ? 'Playing clip'
      : audioState === 'loading'
        ? 'Loading audio…'
        : audioState === 'error'
          ? 'Preview failed — use the timer'
          : audioState === 'muted'
            ? 'No preview — imagine the beat'
            : 'Clip ready'

  const waveLabel =
    audioState === 'playing'
      ? '♪ now playing'
      : audioState === 'loading'
        ? '♪ loading…'
        : previewUrl
          ? '♪ clip'
          : '♪ clip (no preview)'

  return (
    <div className="clip-player" aria-label="Song clip">
      <div
        className={`clip-player__wave clip-player__wave--${audioState}`}
        style={{ '--clip-progress': progress } as CSSProperties}
      >
        {waveLabel}
      </div>
      <p className={`clip-player__status clip-player__status--${audioState}`} aria-live="polite">
        {statusLabel}
      </p>
      <p className="clip-player__hint">
        {audioState === 'error'
          ? 'This track preview could not play — keep guessing from the vibe!'
          : previewUrl
            ? 'Listen closely…'
            : 'No preview for this track — imagine the beat!'}
      </p>
    </div>
  )
}
