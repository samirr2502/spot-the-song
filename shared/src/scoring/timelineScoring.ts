import type { GuessFields } from '../types/game.js'
import type { PlayerRoundResult, TimelineCoinChange } from '../types/round.js'
import type { TimelineBonusPayload, TimelineCardStored } from '../types/timeline.js'
import type { Track } from '../types/track.js'
import { matchField } from './matching.js'

export const TIMELINE_PLACEMENT_POINTS = 100
export const TIMELINE_BONUS_POINTS = 50
export const TIMELINE_STARTING_COINS = 3
export const TIMELINE_CHALLENGE_COST = 2
export const TIMELINE_COIN_PER_BONUS_FIELD = 1

export function isTimelinePlacementCorrect(
  releaseYear: number | null,
  timelineYears: number[],
  insertIndex: number,
): boolean {
  if (releaseYear === null) return false
  const index = Math.max(0, Math.min(insertIndex, timelineYears.length))
  const before = index > 0 ? timelineYears[index - 1] : undefined
  const after = index < timelineYears.length ? timelineYears[index] : undefined

  if (before !== undefined && releaseYear < before) return false
  if (after !== undefined && releaseYear > after) return false
  return true
}

export function describeInsertPosition(insertIndex: number, timelineLength: number): string {
  if (timelineLength === 0) return 'on your timeline'
  if (insertIndex <= 0) return 'before your earliest card'
  if (insertIndex >= timelineLength) return 'after your latest card'
  return 'between your cards'
}

export function findCorrectInsertIndex(
  releaseYear: number | null,
  timelineYears: number[],
): number {
  if (releaseYear === null) return timelineYears.length

  for (let index = 0; index <= timelineYears.length; index++) {
    if (isTimelinePlacementCorrect(releaseYear, timelineYears, index)) {
      return index
    }
  }

  return timelineYears.length
}

export function countTimelineCards(timeline: TimelineCardStored[]): number {
  return timeline.length
}

export function timelineYearsFromTrackIds(
  trackIds: string[],
  getYear: (trackId: string) => number | null | undefined,
): number[] {
  return trackIds
    .map((trackId) => getYear(trackId))
    .filter((year): year is number => year != null)
}

export function awardTimelineBonusCoins(
  activePlayerId: string,
  track: Track,
  bonusAnswers: TimelineBonusPayload | null,
  guessFields: GuessFields,
): TimelineCoinChange[] {
  const changes: TimelineCoinChange[] = []

  if (guessFields.title && bonusAnswers?.title?.trim()) {
    const guess = bonusAnswers.title.trim()
    if (matchField('title', guess, track)) {
      changes.push({
        playerId: activePlayerId,
        delta: TIMELINE_COIN_PER_BONUS_FIELD,
        reason: 'bonus-title',
      })
    }
  }

  if (guessFields.artist && bonusAnswers?.artist?.trim()) {
    const guess = bonusAnswers.artist.trim()
    if (matchField('artist', guess, track)) {
      changes.push({
        playerId: activePlayerId,
        delta: TIMELINE_COIN_PER_BONUS_FIELD,
        reason: 'bonus-artist',
      })
    }
  }

  return changes
}

export function scoreTimelineRound(
  activePlayerId: string,
  track: Track,
  placementCorrect: boolean,
  bonusAnswers: TimelineBonusPayload | null,
  guessFields: GuessFields,
): PlayerRoundResult {
  const fieldScores: PlayerRoundResult['fieldScores'] = []
  let totalRoundPoints = 0

  if (placementCorrect) {
    totalRoundPoints += TIMELINE_PLACEMENT_POINTS
    fieldScores.push({
      field: 'year',
      correct: true,
      points: TIMELINE_PLACEMENT_POINTS,
    })

    if (guessFields.title && bonusAnswers?.title?.trim()) {
      const guess = bonusAnswers.title.trim()
      const correct = matchField('title', guess, track)
      const points = correct ? TIMELINE_BONUS_POINTS : 0
      fieldScores.push({ field: 'title', correct, points, answer: guess })
      totalRoundPoints += points
    }

    if (guessFields.artist && bonusAnswers?.artist?.trim()) {
      const guess = bonusAnswers.artist.trim()
      const correct = matchField('artist', guess, track)
      const points = correct ? TIMELINE_BONUS_POINTS : 0
      fieldScores.push({ field: 'artist', correct, points, answer: guess })
      totalRoundPoints += points
    }
  }

  return {
    playerId: activePlayerId,
    fieldScores,
    speedBonus: 0,
    totalRoundPoints,
  }
}

export type TimelineTurnResolution = {
  placementCorrect: boolean
  cardAwardedTo: string | null
  cardInsertIndex: number | null
  coinChanges: TimelineCoinChange[]
  playerResult: PlayerRoundResult
}

export function resolveTimelineTurn(
  activePlayerId: string,
  challengerPlayerId: string | null,
  track: Track,
  activeTimelineYears: number[],
  challengerTimelineYears: number[] | null,
  insertIndex: number | null,
  bonusAnswers: TimelineBonusPayload | null,
  guessFields: GuessFields,
): TimelineTurnResolution {
  const placementCorrect =
    insertIndex !== null && isTimelinePlacementCorrect(track.year, activeTimelineYears, insertIndex)

  const coinChanges = awardTimelineBonusCoins(
    activePlayerId,
    track,
    bonusAnswers,
    guessFields,
  )

  if (challengerPlayerId) {
    coinChanges.push({
      playerId: challengerPlayerId,
      delta: -TIMELINE_CHALLENGE_COST,
      reason: 'challenge-cost',
    })
  }

  let cardAwardedTo: string | null = null
  let cardInsertIndex: number | null = null

  if (placementCorrect) {
    cardAwardedTo = activePlayerId
    cardInsertIndex = insertIndex
  } else if (challengerPlayerId && challengerTimelineYears) {
    cardAwardedTo = challengerPlayerId
    cardInsertIndex = findCorrectInsertIndex(track.year, challengerTimelineYears)
  }

  const playerResult = scoreTimelineRound(
    activePlayerId,
    track,
    placementCorrect,
    bonusAnswers,
    guessFields,
  )

  return {
    placementCorrect,
    cardAwardedTo,
    cardInsertIndex,
    coinChanges,
    playerResult,
  }
}

export function getTimelineCardCounts(
  playerIds: string[],
  timelines: Map<string, TimelineCardStored[]>,
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const playerId of playerIds) {
    counts[playerId] = countTimelineCards(timelines.get(playerId) ?? [])
  }
  return counts
}

export function getTimelineWinners(
  playerIds: string[],
  timelines: Map<string, TimelineCardStored[]>,
  cardsToWin: number,
): string[] {
  const winners: string[] = []
  for (const playerId of playerIds) {
    const count = countTimelineCards(timelines.get(playerId) ?? [])
    if (count >= cardsToWin) {
      winners.push(playerId)
    }
  }
  return winners
}
