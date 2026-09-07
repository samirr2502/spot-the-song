import { useEffect, useRef } from 'react'

type AudioPlayerProps = {
  audioUrl: string | null
  playing: boolean
  onEnded?: () => void
}

export default function AudioPlayer({
  audioUrl,
  playing,
  onEnded,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !audioUrl) return

    audio.src = audioUrl
    audio.load()
  }, [audioUrl])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !audioUrl) return

    if (playing) {
      void audio.play().catch(() => {
        // Autoplay may be blocked until user interaction
      })
    } else {
      audio.pause()
      audio.currentTime = 0
    }
  }, [playing, audioUrl])

  return (
    <audio ref={audioRef} onEnded={onEnded} preload="auto" />
  )
}
