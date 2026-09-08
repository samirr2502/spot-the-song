import type { GuessFields } from '../types/game.js'
import type { GuessFieldKey, PlayerRoundResult } from '../types/round.js'
import type { FieldVoteOutcome, VotePayload } from '../types/voting.js'
import { POINTS_PER_FIELD } from './allInScoring.js'

export function enabledFields(guessFields: GuessFields): GuessFieldKey[] {
  return (['title', 'artist', 'album', 'year'] as const).filter((field) => guessFields[field])
}

export function tallyFieldVote(
  votes: Map<string, VotePayload>,
  field: GuessFieldKey,
  activePlayerId: string,
): FieldVoteOutcome {
  let yesVotes = 0
  let noVotes = 0

  for (const [playerId, vote] of votes.entries()) {
    if (playerId === activePlayerId) continue
    if (vote[field] === true) yesVotes += 1
    else if (vote[field] === false) noVotes += 1
  }

  return {
    field,
    accepted: yesVotes > noVotes,
    yesVotes,
    noVotes,
  }
}

export function scoreTurnGuessRound(
  activePlayerId: string,
  votes: Map<string, VotePayload>,
  guessFields: GuessFields,
): { fieldOutcomes: FieldVoteOutcome[]; result: PlayerRoundResult } {
  const fields = enabledFields(guessFields)
  const fieldOutcomes = fields.map((field) => tallyFieldVote(votes, field, activePlayerId))

  const fieldScores = fieldOutcomes.map((outcome) => ({
    field: outcome.field,
    correct: outcome.accepted,
    points: outcome.accepted ? POINTS_PER_FIELD : 0,
  }))

  const totalRoundPoints = fieldScores.reduce((sum, entry) => sum + entry.points, 0)

  return {
    fieldOutcomes,
    result: {
      playerId: activePlayerId,
      fieldScores,
      speedBonus: 0,
      totalRoundPoints,
    },
  }
}

export function allEligibleVotesSubmitted(
  playerIds: string[],
  activePlayerId: string,
  votes: Map<string, VotePayload>,
): boolean {
  const voters = playerIds.filter((id) => id !== activePlayerId)
  return voters.every((id) => votes.has(id))
}
