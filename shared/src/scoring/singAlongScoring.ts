import type { PlayerRoundResult } from '../types/round.js'

export const MIN_RATING = 1
export const MAX_RATING = 10
export const SING_ALONG_POINTS_MULTIPLIER = 10

export function validateRatingValue(rating: number): string | null {
  if (!Number.isInteger(rating) || rating < MIN_RATING || rating > MAX_RATING) {
    return `Rating must be an integer from ${MIN_RATING} to ${MAX_RATING}.`
  }
  return null
}

export function averageRatings(
  ratings: Map<string, number>,
  activePlayerId: string,
): { average: number; count: number } {
  const values = Array.from(ratings.entries())
    .filter(([playerId]) => playerId !== activePlayerId)
    .map(([, rating]) => rating)

  if (values.length === 0) {
    return { average: 0, count: 0 }
  }

  const sum = values.reduce((total, rating) => total + rating, 0)
  return { average: sum / values.length, count: values.length }
}

export function scaleRatingToPoints(averageRating: number): number {
  return Math.round(averageRating * SING_ALONG_POINTS_MULTIPLIER)
}

export function scoreSingAlongRound(
  activePlayerId: string,
  ratings: Map<string, number>,
): {
  averageRating: number
  ratingCount: number
  result: PlayerRoundResult
} {
  const { average, count } = averageRatings(ratings, activePlayerId)
  const totalRoundPoints = scaleRatingToPoints(average)

  return {
    averageRating: Math.round(average * 10) / 10,
    ratingCount: count,
    result: {
      playerId: activePlayerId,
      fieldScores: [],
      speedBonus: 0,
      totalRoundPoints,
    },
  }
}

export function allEligibleRatingsSubmitted(
  playerIds: string[],
  activePlayerId: string,
  ratings: Map<string, number>,
): boolean {
  const raters = playerIds.filter((id) => id !== activePlayerId)
  return raters.every((id) => ratings.has(id))
}
