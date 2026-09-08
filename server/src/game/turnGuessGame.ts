import type { GameRoom, RoundResultsPayload } from '@spot-the-song/shared'
import type { VotePayload } from '@spot-the-song/shared'
import { enabledFields, scoreTurnGuessRound } from '@spot-the-song/shared'
import type { RoomRuntime } from './roomRuntime.js'
import { buildLeaderboard } from './allInGame.js'

export function getActivePlayerForTurn(room: GameRoom, runtime: RoomRuntime) {
  const connected = room.players.filter((player) => player.connected)
  const pool = connected.length > 0 ? connected : room.players
  const index = runtime.turnRotationIndex % pool.length
  return pool[index]!
}

export function storeVote(runtime: RoomRuntime, playerId: string, votes: VotePayload): void {
  runtime.roundVotes.set(playerId, votes)
}

export function scoreTurnGuessRoundResults(
  room: GameRoom,
  runtime: RoomRuntime,
): RoundResultsPayload | null {
  const track = runtime.currentTrack
  const activePlayerId = room.currentRound?.activePlayerId
  if (!track || !activePlayerId || !room.currentRound) return null

  const { fieldOutcomes, result } = scoreTurnGuessRound(
    activePlayerId,
    runtime.roundVotes,
    room.settings.guessFields,
  )

  room.scores[activePlayerId] = (room.scores[activePlayerId] ?? 0) + result.totalRoundPoints

  return {
    roundIndex: room.currentRound.index,
    mode: 'turn-guess',
    activePlayerId,
    track: { ...track },
    fieldOutcomes,
    playerResults: [result],
    leaderboard: buildLeaderboard(room),
  }
}

export function allTurnVotesSubmitted(room: GameRoom, runtime: RoomRuntime): boolean {
  const activePlayerId = room.currentRound?.activePlayerId
  if (!activePlayerId) return false

  const voterIds = room.players.filter((player) => player.connected).map((player) => player.id)
  const voters = voterIds.filter((id) => id !== activePlayerId)
  if (voters.length === 0) return true

  return voters.every((id) => runtime.roundVotes.has(id))
}

export function validateVotePayload(
  votes: VotePayload,
  guessFields: GameRoom['settings']['guessFields'],
): string | null {
  const fields = enabledFields(guessFields)
  for (const field of fields) {
    if (typeof votes[field] !== 'boolean') {
      return `Vote on every field (${fields.join(', ')}).`
    }
  }
  return null
}
