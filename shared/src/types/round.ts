export type GuessFieldKey = 'title' | 'artist' | 'album' | 'year'

export type RoundTrackPublic = {
  id: string
  previewUrl?: string
  artworkUrl?: string
}

export type SubmitAnswersPayload = {
  title?: string
  artist?: string
  album?: string
  year?: string
}

export type FieldScore = {
  field: GuessFieldKey
  correct: boolean
  points: number
}

export type PlayerRoundResult = {
  playerId: string
  fieldScores: FieldScore[]
  speedBonus: number
  totalRoundPoints: number
}

export type RoundResultsPayload = {
  roundIndex: number
  mode?: 'all-in' | 'turn-guess' | 'sing-along' | 'timeline'
  activePlayerId?: string
  averageRating?: number
  ratingCount?: number
  placementCorrect?: boolean
  insertIndex?: number
  track: {
    id: string
    title: string
    artist: string
    album: string
    year: number
    artworkUrl?: string
    previewUrl?: string
  }
  fieldOutcomes?: Array<{
    field: GuessFieldKey
    accepted: boolean
    yesVotes: number
    noVotes: number
  }>
  playerResults: PlayerRoundResult[]
  leaderboard: Array<{ playerId: string; name: string; score: number }>
}
