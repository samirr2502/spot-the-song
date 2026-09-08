import { describe, expect, it } from 'vitest'
import type { VotePayload } from '../types/voting.js'
import { scoreTurnGuessRound } from './turnGuessScoring.js'

describe('scoreTurnGuessRound', () => {
  it('accepts fields with majority yes votes', () => {
    const votes = new Map<string, VotePayload>([
      ['voter-a', { title: true, artist: true }],
      ['voter-b', { title: true, artist: false }],
    ])

    const { fieldOutcomes, result } = scoreTurnGuessRound(
      'active',
      votes,
      { title: true, artist: true, album: false, year: false },
    )

    expect(fieldOutcomes.find((entry) => entry.field === 'title')?.accepted).toBe(true)
    expect(fieldOutcomes.find((entry) => entry.field === 'artist')?.accepted).toBe(false)
    expect(result.totalRoundPoints).toBe(100)
  })

  it('treats ties as no', () => {
    const votes = new Map<string, VotePayload>([
      ['voter-a', { title: true }],
      ['voter-b', { title: false }],
    ])

    const { fieldOutcomes } = scoreTurnGuessRound(
      'active',
      votes,
      { title: true, artist: false, album: false, year: false },
    )

    expect(fieldOutcomes[0]?.accepted).toBe(false)
  })
})
