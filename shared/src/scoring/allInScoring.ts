import type { GuessFieldKey, PlayerRoundResult, SubmitAnswersPayload } from '../types/round.js'
import type { GuessFields } from '../types/game.js'
import type { Track } from '../types/track.js'
import { matchField } from './matching.js'

export const POINTS_PER_FIELD = 100
export const MAX_SPEED_BONUS = 50

export function computeSpeedBonus(
  submittedAt: number,
  roundStartedAt: number,
  endsAt: number,
): number {
  const totalMs = endsAt - roundStartedAt
  if (totalMs <= 0) return 0

  const remainingMs = Math.max(0, endsAt - submittedAt)
  return Math.round((remainingMs / totalMs) * MAX_SPEED_BONUS)
}

export function scorePlayerRound(
  playerId: string,
  answers: SubmitAnswersPayload,
  track: Track,
  guessFields: GuessFields,
  submittedAt: number,
  roundStartedAt: number,
  endsAt: number,
): PlayerRoundResult {
  const fieldScores: PlayerRoundResult['fieldScores'] = []
  const enabledFields: GuessFieldKey[] = (
    ['title', 'artist', 'album', 'year'] as const
  ).filter((field) => guessFields[field])

  for (const field of enabledFields) {
    const guess = answers[field] ?? ''
    const correct = matchField(field, guess, track)
    fieldScores.push({
      field,
      correct,
      points: correct ? POINTS_PER_FIELD : 0,
    })
  }

  const fieldPoints = fieldScores.reduce((sum, entry) => sum + entry.points, 0)
  const hasAnyCorrect = fieldScores.some((entry) => entry.correct)
  const speedBonus = hasAnyCorrect
    ? computeSpeedBonus(submittedAt, roundStartedAt, endsAt)
    : 0

  return {
    playerId,
    fieldScores,
    speedBonus,
    totalRoundPoints: fieldPoints + speedBonus,
  }
}
