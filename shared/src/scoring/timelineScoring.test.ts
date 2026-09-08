import { describe, expect, it } from 'vitest'
import type { GuessFields } from '../types/game.js'
import type { TimelineCardStored } from '../types/timeline.js'
import type { Track } from '../types/track.js'
import {
  awardTimelineBonusCoins,
  findCorrectInsertIndex,
  getTimelineCardCounts,
  getTimelineWinners,
  isTimelinePlacementCorrect,
  resolveTimelineTurn,
  TIMELINE_CHALLENGE_COST,
  TIMELINE_COIN_PER_BONUS_FIELD,
} from './timelineScoring.js'

const track: Track = {
  id: 'song-1',
  title: 'Hello',
  artist: 'Adele',
  album: '25',
  year: 2015,
  artworkUrl: null,
  spotifyUri: 'spotify:track:1',
  spotifyUrl: 'https://open.spotify.com/track/1',
  durationMs: 180000,
}

const guessFields: GuessFields = {
  title: true,
  artist: true,
  album: false,
  year: false,
}

describe('timelineScoring', () => {
  it('validates chronological placement', () => {
    expect(isTimelinePlacementCorrect(2015, [2010, 2020], 1)).toBe(true)
    expect(isTimelinePlacementCorrect(2005, [2010, 2020], 1)).toBe(false)
  })

  it('finds the correct insert index on a timeline', () => {
    expect(findCorrectInsertIndex(2015, [2010, 2020])).toBe(1)
    expect(findCorrectInsertIndex(2005, [2010, 2020])).toBe(0)
    expect(findCorrectInsertIndex(2025, [2010, 2020])).toBe(2)
  })

  it('awards one coin per correct bonus field', () => {
    const changes = awardTimelineBonusCoins('player-1', track, {
      title: 'Hello',
      artist: 'Wrong',
    }, guessFields)

    expect(changes).toEqual([
      { playerId: 'player-1', delta: TIMELINE_COIN_PER_BONUS_FIELD, reason: 'bonus-title' },
    ])
  })

  it('awards the active player the card when placement is correct', () => {
    const resolution = resolveTimelineTurn(
      'active',
      null,
      track,
      [2010, 2020],
      null,
      1,
      null,
      guessFields,
    )

    expect(resolution.placementCorrect).toBe(true)
    expect(resolution.cardAwardedTo).toBe('active')
    expect(resolution.cardInsertIndex).toBe(1)
    expect(resolution.coinChanges).toEqual([])
  })

  it('transfers the card to the challenger when placement is wrong', () => {
    const resolution = resolveTimelineTurn(
      'active',
      'challenger',
      track,
      [2010, 2020],
      [2000],
      0,
      null,
      guessFields,
    )

    expect(resolution.placementCorrect).toBe(false)
    expect(resolution.cardAwardedTo).toBe('challenger')
    expect(resolution.cardInsertIndex).toBe(1)
    expect(resolution.coinChanges).toContainEqual({
      playerId: 'challenger',
      delta: -TIMELINE_CHALLENGE_COST,
      reason: 'challenge-cost',
    })
  })

  it('discards the card when placement is wrong and unchallenged', () => {
    const resolution = resolveTimelineTurn(
      'active',
      null,
      track,
      [2010, 2020],
      null,
      0,
      null,
      guessFields,
    )

    expect(resolution.placementCorrect).toBe(false)
    expect(resolution.cardAwardedTo).toBeNull()
    expect(resolution.cardInsertIndex).toBeNull()
  })

  it('counts cards and detects winners including starter cards', () => {
    const timelines = new Map<string, TimelineCardStored[]>([
      ['p1', [{ trackId: 'a', isStarter: true, revealed: true }, { trackId: 'b', isStarter: false, revealed: true }]],
      ['p2', [{ trackId: 'c', isStarter: true, revealed: true }]],
    ])

    expect(getTimelineCardCounts(['p1', 'p2'], timelines)).toEqual({ p1: 2, p2: 1 })
    expect(getTimelineWinners(['p1', 'p2'], timelines, 2)).toEqual(['p1'])
    expect(getTimelineWinners(['p1', 'p2'], timelines, 3)).toEqual([])
  })
})
