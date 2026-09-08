import { describe, expect, it } from 'vitest'
import { resolveRatingOrDefault } from './singAlongScoring.js'

describe('resolveRatingOrDefault', () => {
  it('defaults to 10 when nothing was selected', () => {
    expect(resolveRatingOrDefault(null)).toBe(10)
    expect(resolveRatingOrDefault(undefined)).toBe(10)
  })

  it('keeps the selected rating when the player picked a value', () => {
    expect(resolveRatingOrDefault(3)).toBe(3)
    expect(resolveRatingOrDefault(1)).toBe(1)
  })
})
