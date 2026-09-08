import { describe, expect, it } from 'vitest'
import { computeSpeedBonus, scorePlayerRound } from './allInScoring.js'

describe('computeSpeedBonus', () => {
  it('returns max bonus at round start', () => {
    expect(computeSpeedBonus(0, 0, 30_000)).toBe(50)
  })

  it('returns zero at deadline', () => {
    expect(computeSpeedBonus(30_000, 0, 30_000)).toBe(0)
  })
})

describe('scorePlayerRound', () => {
  const track = {
    id: '1',
    title: 'Yellow',
    artist: 'Coldplay',
    album: 'Parachutes',
    year: 2000,
    artworkUrl: null,
    spotifyUri: 'spotify:track:1',
    spotifyUrl: 'https://open.spotify.com/track/1',
    durationMs: 266_000,
  }

  it('scores enabled fields and speed bonus', () => {
    const result = scorePlayerRound(
      'p1',
      { title: 'Yellow', artist: 'Coldplay' },
      track,
      { title: true, artist: true, album: false, year: false },
      5_000,
      0,
      30_000,
    )

    expect(result.fieldScores).toHaveLength(2)
    expect(result.fieldScores.every((entry) => entry.correct)).toBe(true)
    expect(result.speedBonus).toBeGreaterThan(0)
    expect(result.totalRoundPoints).toBeGreaterThan(200)
  })

  it('does not award speed bonus when every guess is wrong', () => {
    const result = scorePlayerRound(
      'p1',
      { title: 'Wrong', artist: 'Wrong' },
      track,
      { title: true, artist: true, album: false, year: false },
      1_000,
      0,
      30_000,
    )

    expect(result.fieldScores.every((entry) => !entry.correct)).toBe(true)
    expect(result.speedBonus).toBe(0)
    expect(result.totalRoundPoints).toBe(0)
  })
})
