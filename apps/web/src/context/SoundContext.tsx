import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const MUTE_KEY = 'sts-sfx-muted'

type SoundContextValue = {
  audioUnlocked: boolean
  unlockAudio: () => void
  muted: boolean
  toggleMuted: () => void
  play: (name: SfxName, options?: { vibrate?: boolean | number[] }) => void
}

type SfxName =
  | 'revealTitle'
  | 'placeCard'
  | 'revealYear'
  | 'correct'
  | 'wrong'
  | 'win'
  | 'tick'

const SoundContext = createContext<SoundContextValue | null>(null)

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  return new Ctx()
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.15,
  delay = 0,
) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.value = frequency
  g.gain.setValueAtTime(gain, ctx.currentTime + delay)
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration)
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(ctx.currentTime + delay)
  osc.stop(ctx.currentTime + delay + duration)
}

function playSfx(ctx: AudioContext, name: SfxName) {
  switch (name) {
    case 'revealTitle':
      playTone(ctx, 440, 0.12, 'sine', 0.12)
      playTone(ctx, 660, 0.18, 'sine', 0.1, 0.08)
      break
    case 'placeCard':
      playTone(ctx, 320, 0.08, 'triangle', 0.14)
      playTone(ctx, 480, 0.1, 'triangle', 0.08, 0.05)
      break
    case 'revealYear':
      playTone(ctx, 220, 0.15, 'sine', 0.18)
      playTone(ctx, 330, 0.2, 'sine', 0.15, 0.1)
      playTone(ctx, 440, 0.25, 'sine', 0.12, 0.2)
      break
    case 'correct':
      playTone(ctx, 523, 0.12, 'sine', 0.12)
      playTone(ctx, 659, 0.12, 'sine', 0.1, 0.1)
      playTone(ctx, 784, 0.2, 'sine', 0.08, 0.2)
      break
    case 'wrong':
      playTone(ctx, 200, 0.2, 'sawtooth', 0.08)
      playTone(ctx, 160, 0.25, 'sawtooth', 0.06, 0.12)
      break
    case 'win':
      playTone(ctx, 440, 0.1, 'sine', 0.12)
      playTone(ctx, 554, 0.1, 'sine', 0.1, 0.1)
      playTone(ctx, 659, 0.1, 'sine', 0.1, 0.2)
      playTone(ctx, 880, 0.3, 'sine', 0.08, 0.3)
      break
    case 'tick':
      playTone(ctx, 800, 0.04, 'square', 0.04)
      break
  }
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const ctxRef = useRef<AudioContext | null>(null)
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const [muted, setMutedState] = useState(() => {
    if (typeof localStorage === 'undefined') return false
    return localStorage.getItem(MUTE_KEY) === 'true'
  })

  const unlockAudio = useCallback(() => {
    setAudioUnlocked(true)
    if (!ctxRef.current) {
      ctxRef.current = getAudioContext()
    }
  }, [])

  const toggleMuted = useCallback(() => {
    setMutedState((prev) => {
      const next = !prev
      localStorage.setItem(MUTE_KEY, String(next))
      return next
    })
  }, [])

  const play = useCallback(
    (name: SfxName, options?: { vibrate?: boolean | number[] }) => {
      if (muted || !audioUnlocked) return
      const ctx = ctxRef.current
      if (!ctx) return
      if (ctx.state === 'suspended') void ctx.resume()
      playSfx(ctx, name)
      if (options?.vibrate && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(options.vibrate === true ? 30 : options.vibrate)
      }
    },
    [audioUnlocked, muted],
  )

  useEffect(() => {
    if (audioUnlocked && !ctxRef.current) {
      ctxRef.current = getAudioContext()
    }
  }, [audioUnlocked])

  return (
    <SoundContext.Provider value={{ audioUnlocked, unlockAudio, muted, toggleMuted, play }}>
      {children}
    </SoundContext.Provider>
  )
}

export function useSound() {
  const ctx = useContext(SoundContext)
  if (!ctx) throw new Error('useSound must be used within SoundProvider')
  return ctx
}

export type { SfxName }
