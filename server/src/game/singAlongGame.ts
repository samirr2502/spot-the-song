import type { GameRoom, RatingPayload, RoundResultsPayload } from '@spot-the-song/shared'
import { scoreSingAlongRound, validateRatingValue } from '@spot-the-song/shared'
import type { RoomRuntime } from './roomRuntime.js'
import { toRevealTrack } from './roomRuntime.js'
import { buildLeaderboard } from './allInGame.js'
import { getActivePlayerForTurn } from './turnGuessGame.js'

export { getActivePlayerForTurn }

export function storeRating(runtime: RoomRuntime, playerId: string, rating: number): void {
  runtime.roundRatings.set(playerId, rating)
}

export function scoreSingAlongRoundResults(
  room: GameRoom,
  runtime: RoomRuntime,
): RoundResultsPayload | null {
  const track = runtime.currentTrack
  const activePlayerId = room.currentRound?.activePlayerId
  if (!track || !activePlayerId || !room.currentRound) return null

  const { averageRating, ratingCount, result } = scoreSingAlongRound(
    activePlayerId,
    runtime.roundRatings,
  )

  room.scores[activePlayerId] = (room.scores[activePlayerId] ?? 0) + result.totalRoundPoints

  return {
    roundIndex: room.currentRound.index,
    mode: 'sing-along',
    activePlayerId,
    averageRating,
    ratingCount,
    track: toRevealTrack(track),
    playerResults: [result],
    leaderboard: buildLeaderboard(room),
  }
}

export function allSingRatingsSubmitted(room: GameRoom, runtime: RoomRuntime): boolean {
  const activePlayerId = room.currentRound?.activePlayerId
  if (!activePlayerId) return false

  const raterIds = room.players.filter((player) => player.connected).map((player) => player.id)
  const raters = raterIds.filter((id) => id !== activePlayerId)
  if (raters.length === 0) return true

  return raters.every((id) => runtime.roundRatings.has(id))
}

export function validateRatingPayload(payload: RatingPayload): string | null {
  return validateRatingValue(payload.rating)
}
