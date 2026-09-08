import type { GameSettings } from '../types/game.js'

export type CombinedRoundWindow = {
  clipMs: number
  extraMs: number
  totalMs: number
  clipEndsAt: number
  endsAt: number
}

export function clipMsFromSettings(settings: Pick<GameSettings, 'clipDurationSeconds'>): number {
  return settings.clipDurationSeconds * 1000
}

export function guessPhaseMs(settings: Pick<GameSettings, 'guessTimerSeconds'>): number {
  return (settings.guessTimerSeconds ?? 0) * 1000
}

export function computeCombinedRoundWindow(
  startedAt: number,
  clipDurationSeconds: number,
  extraSeconds: number,
): CombinedRoundWindow {
  const clipMs = clipDurationSeconds * 1000
  const extraMs = extraSeconds * 1000
  return {
    clipMs,
    extraMs,
    totalMs: clipMs + extraMs,
    clipEndsAt: startedAt + clipMs,
    endsAt: startedAt + clipMs + extraMs,
  }
}

export function computeCombinedRoundWindowFromSettings(
  startedAt: number,
  settings: Pick<GameSettings, 'clipDurationSeconds' | 'guessTimerSeconds'>,
): CombinedRoundWindow {
  return computeCombinedRoundWindow(
    startedAt,
    settings.clipDurationSeconds,
    settings.guessTimerSeconds ?? 0,
  )
}

export type CombinedRoundPhaseCallbacks = {
  onClipEnd: () => void
  onRoundEnd: () => void
}

/** Schedules clip-end and round-end callbacks — used by RoomManager and tests. */
export function scheduleCombinedRoundPhases(
  window: CombinedRoundWindow,
  schedule: (fn: () => void, delayMs: number) => unknown,
  callbacks: CombinedRoundPhaseCallbacks,
): { clipTimer: unknown; roundTimer: unknown } {
  const roundTimer = schedule(callbacks.onRoundEnd, window.totalMs)
  const clipTimer = schedule(callbacks.onClipEnd, window.clipMs)
  return { clipTimer, roundTimer }
}
