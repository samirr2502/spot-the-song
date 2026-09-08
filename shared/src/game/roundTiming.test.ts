import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  computeCombinedRoundWindow,
  computeCombinedRoundWindowFromSettings,
  scheduleCombinedRoundPhases,
} from './roundTiming.js'

describe('computeCombinedRoundWindow', () => {
  it('adds clip and extra seconds for a 1s + 1s window', () => {
    const window = computeCombinedRoundWindow(1_000, 1, 1)

    expect(window.clipMs).toBe(1_000)
    expect(window.extraMs).toBe(1_000)
    expect(window.totalMs).toBe(2_000)
    expect(window.clipEndsAt).toBe(2_000)
    expect(window.endsAt).toBe(3_000)
  })

  it('uses clip-only timing when extra seconds are zero', () => {
    const window = computeCombinedRoundWindow(0, 15, 0)

    expect(window.totalMs).toBe(15_000)
    expect(window.clipEndsAt).toBe(15_000)
    expect(window.endsAt).toBe(15_000)
  })

  it('matches production defaults from game settings', () => {
    const window = computeCombinedRoundWindowFromSettings(5_000, {
      clipDurationSeconds: 30,
      guessTimerSeconds: 0,
    })

    expect(window.clipEndsAt).toBe(35_000)
    expect(window.endsAt).toBe(35_000)
    expect(window.totalMs).toBe(30_000)
  })
})

describe('scheduleCombinedRoundPhases', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fires clip end before round end for 1s clip + 1s extra', () => {
    const events: string[] = []
    const window = computeCombinedRoundWindow(0, 1, 1)

    scheduleCombinedRoundPhases(
      window,
      (fn, delayMs) => setTimeout(fn, delayMs),
      {
        onClipEnd: () => events.push('clip-end'),
        onRoundEnd: () => events.push('round-end'),
      },
    )

    vi.advanceTimersByTime(999)
    expect(events).toEqual([])

    vi.advanceTimersByTime(1)
    expect(events).toEqual(['clip-end'])

    vi.advanceTimersByTime(999)
    expect(events).toEqual(['clip-end'])

    vi.advanceTimersByTime(1)
    expect(events).toEqual(['clip-end', 'round-end'])
  })

  it('fires round end immediately after clip when extra time is zero', () => {
    const events: string[] = []
    const window = computeCombinedRoundWindow(0, 1, 0)

    scheduleCombinedRoundPhases(
      window,
      (fn, delayMs) => setTimeout(fn, delayMs),
      {
        onClipEnd: () => events.push('clip-end'),
        onRoundEnd: () => events.push('round-end'),
      },
    )

    vi.advanceTimersByTime(1_000)
    expect(events.sort()).toEqual(['clip-end', 'round-end'])
  })
})
