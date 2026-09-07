import { useEffect, useRef, useState } from 'react'
import type { GamePhase, GameState } from '@spot-the-song/game-engine'
import type { SfxName } from '../context/SoundContext'

export type RevealStage = 'hidden' | 'revealing-title' | 'title' | 'revealing-year' | 'year'

type RevealEvent = {
  stage: RevealStage
  sound?: SfxName
  vibrate?: boolean
}

const REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const TITLE_DURATION = REDUCED_MOTION ? 0 : 600
const YEAR_DURATION = REDUCED_MOTION ? 0 : 700

export function useRevealSequence(
  game: GameState | null,
  hasGuessed: boolean,
  onPlaySound: (name: SfxName, options?: { vibrate?: boolean }) => void,
) {
  const [activeStage, setActiveStage] = useState<RevealStage>('hidden')
  const prevPhaseRef = useRef<GamePhase | null>(null)
  const prevGuessedRef = useRef(false)
  const prevResolutionRef = useRef<string | null>(null)
  const timeoutRef = useRef<number | null>(null)

  const clearTimer = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  const runSequence = (events: RevealEvent[]) => {
    clearTimer()
    if (events.length === 0) return

    let index = 0
    const step = () => {
      const event = events[index]
      if (!event) return
      setActiveStage(event.stage)
      if (event.sound) onPlaySound(event.sound, { vibrate: event.vibrate })
      index += 1
      if (index < events.length) {
        const delay =
          event.stage === 'revealing-title'
            ? TITLE_DURATION
            : event.stage === 'revealing-year'
              ? YEAR_DURATION
              : 0
        timeoutRef.current = window.setTimeout(step, delay)
      }
    }
    step()
  }

  useEffect(() => {
    return clearTimer
  }, [])

  useEffect(() => {
    if (!game) return
    if (hasGuessed && !prevGuessedRef.current && game.phase === 'playing') {
      if (REDUCED_MOTION) {
        setActiveStage('title')
        onPlaySound('revealTitle')
      } else {
        runSequence([
          { stage: 'revealing-title', sound: 'revealTitle' },
          { stage: 'title' },
        ])
      }
    }
    prevGuessedRef.current = hasGuessed
  }, [game, hasGuessed, onPlaySound])

  useEffect(() => {
    if (!game) return
    const prev = prevPhaseRef.current
    if (prev === 'playing' && game.phase === 'challenge' && !hasGuessed) {
      setActiveStage('title')
    }
    prevPhaseRef.current = game.phase
  }, [game, hasGuessed])

  useEffect(() => {
    if (!game) return
    const resolution = game.lastClaimResolution
    const key = resolution ? `${resolution.songId}-${resolution.releaseYear}` : null

    if (game.phase === 'reveal' && key && key !== prevResolutionRef.current) {
      prevResolutionRef.current = key
      if (REDUCED_MOTION) {
        setActiveStage('year')
        onPlaySound('revealYear', { vibrate: true })
        if (resolution?.placementCorrect) {
          onPlaySound('correct')
        } else if (resolution?.awardedTo && resolution.challengerId) {
          onPlaySound('win', { vibrate: true })
        } else if (!resolution?.placementCorrect) {
          onPlaySound('wrong')
        }
      } else {
        runSequence([
          { stage: 'revealing-year', sound: 'revealYear', vibrate: true },
          { stage: 'year' },
        ])
        timeoutRef.current = window.setTimeout(() => {
          if (resolution?.placementCorrect) {
            onPlaySound('correct')
          } else if (resolution?.awardedTo && resolution.challengerId) {
            onPlaySound('win', { vibrate: true })
          } else if (!resolution?.placementCorrect) {
            onPlaySound('wrong')
          }
        }, YEAR_DURATION + 100)
      }
    }

    if (game.phase === 'playing' && prevPhaseRef.current === 'reveal') {
      setActiveStage(hasGuessed ? 'title' : 'hidden')
      prevResolutionRef.current = null
    }
  }, [game, hasGuessed, onPlaySound])

  useEffect(() => {
    if (!game) return
    if (game.phase === 'playing' && !hasGuessed) {
      setActiveStage('hidden')
    }
  }, [game, hasGuessed])

  if (!game) {
    return { revealStage: 'hidden' as RevealStage, activeStage: 'hidden' as RevealStage }
  }

  const faceModeFromStage = (): RevealStage => {
    if (game.phase === 'reveal') {
      if (activeStage === 'revealing-year' || activeStage === 'year') return activeStage
      return 'title'
    }
    if (game.phase === 'challenge' || hasGuessed) {
      if (activeStage === 'hidden') return 'title'
      return activeStage
    }
    return activeStage
  }

  return { revealStage: faceModeFromStage(), activeStage }
}
