import type { GuessFieldKey } from './round.js'

export type VotePayload = {
  title?: boolean
  artist?: boolean
  album?: boolean
  year?: boolean
}

export type FieldVoteOutcome = {
  field: GuessFieldKey
  accepted: boolean
  yesVotes: number
  noVotes: number
}
