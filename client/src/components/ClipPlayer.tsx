import { type CSSProperties, useEffect, useRef, useState } from 'react'

type ClipPlayerProps = {
  previewUrl?: string
  clipDurationSeconds: number
  playing: boolean
}

export function ClipPlayer({ previewUrl, clipDurationSeconds, playing }: ClipPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!playing) {
      setElapsed(0)
      audioRef.current?.pause()
      return
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
      void audio.play().catch(() => {
        // Preview unavailable — visual timer only
      })
    }

    return () => {
      window.clearInterval(interval)
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [playing, previewUrl, clipDurationSeconds])

  const progress = clipDurationSeconds > 0 ? elapsed / clipDurationSeconds : 0

  return (
    <div className="clip-player" aria-label="Song clip">
      <div className="clip-player__wave" style={{ '--clip-progress': progress } as CSSProperties}>
        {previewUrl ? '♪ now playing' : '♪ clip (no preview)'}
      </div>
      <p className="clip-player__hint">
        {previewUrl ? 'Listen closely…' : 'No preview for this track — imagine the beat!'}
      </p>
    </div>
  )
}
