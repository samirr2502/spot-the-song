import type { GuessFields } from '../types/game.js'
import type { PlayerRoundResult } from '../types/round.js'
import type { TimelineBonusPayload } from '../types/timeline.js'
import type { Track } from '../types/track.js'
import { matchField } from './matching.js'

export const TIMELINE_PLACEMENT_POINTS = 100
export const TIMELINE_BONUS_POINTS = 50

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
      const correct = matchField('title', bonusAnswers.title, track)
      const points = correct ? TIMELINE_BONUS_POINTS : 0
      fieldScores.push({ field: 'title', correct, points })
      totalRoundPoints += points
    }

    if (guessFields.artist && bonusAnswers?.artist?.trim()) {
      const correct = matchField('artist', bonusAnswers.artist, track)
      const points = correct ? TIMELINE_BONUS_POINTS : 0
      fieldScores.push({ field: 'artist', correct, points })
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

export function timelineYearsFromTrackIds(
  trackIds: string[],
  getYear: (trackId: string) => number | null | undefined,
): number[] {
  return trackIds
    .map((trackId) => getYear(trackId))
    .filter((year): year is number => year != null)
}
