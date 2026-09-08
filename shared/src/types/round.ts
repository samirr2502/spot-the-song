export type GuessFieldKey = 'title' | 'artist' | 'album' | 'year'

export type RoundTrackPublic = {
  id: string
  /** @deprecated Legacy preview clip — Phase 8b replaces with host Spotify playback */
  previewUrl?: string
  artworkUrl?: string
}

export type RevealTrack = {
  id: string
  title: string
  artist: string
  album: string
  year: number | null
  artworkUrl?: string
  spotifyUrl: string
  /** @deprecated Optional legacy preview */
  previewUrl?: string
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
  /** What the player submitted — shown on results before/alongside the reveal card. */
  answer?: string
}

export type TimelineCoinChangeReason =
  | 'bonus-title'
  | 'bonus-artist'
  | 'challenge-cost'

export type TimelineCoinChange = {
  playerId: string
  delta: number
  reason: TimelineCoinChangeReason
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
  challengerPlayerId?: string
  cardAwardedTo?: string
  coinChanges?: TimelineCoinChange[]
  cardCounts?: Record<string, number>
  track: RevealTrack
  fieldOutcomes?: Array<{
    field: GuessFieldKey
    accepted: boolean
    yesVotes: number
    noVotes: number
  }>
  playerResults: PlayerRoundResult[]
  leaderboard: Array<{ playerId: string; name: string; score: number }>
}
