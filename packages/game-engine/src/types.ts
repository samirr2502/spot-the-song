export type Song = {
  id: string
  title: string
  artist: string
  album: string
  audioUrl: string
  releaseYear: number
  alternateTitles?: string[]
  alternateArtists?: string[]
}

export type Album = {
  id: string
  name: string
  ownerPlayerId: string
  songs: Song[]
}

export type Player = {
  id: string
  name: string
  score: number
  order: number
}

export type GamePhase =
  | 'lobby'
  | 'playing'
  | 'challenge'
  | 'reveal'
  | 'finished'

export type Turn = {
  activePlayerId: string
  currentSongId: string
  startedAt: number
  guessDeadline: number
  guess?: string
  isCorrect?: boolean
}

export type TurnHistoryEntry = {
  playerId: string
  songId: string
  guess: string
  isCorrect: boolean
}

export type PendingClaim = {
  songId: string
  claimantId: string
  insertIndex: number
  challengerId: string | null
}

export type ClaimResolution = {
  songId: string
  releaseYear: number
  placementCorrect: boolean
  awardedTo: string | null
  discarded: boolean
  challengerId: string | null
  guessCorrect: boolean
  coinsAwarded: number
}

export type PlayerBoard = {
  coins: number
  cards: string[]
  starterSongId: string | null
  guessedSongIds: string[]
  revealedSongIds: string[]
}

export type GameSettings = {
  guessTimeSeconds: number
}

export type GameState = {
  id: string
  phase: GamePhase
  players: Player[]
  albums: Album[]
  deck: string[]
  playedSongIds: string[]
  currentTurn: Turn | null
  turnHistory: TurnHistoryEntry[]
  settings: GameSettings
  activePlayerIndex: number
  boards: Record<string, PlayerBoard>
  pendingClaim: PendingClaim | null
  lastClaimResolution: ClaimResolution | null
}

export const DEFAULT_SETTINGS: GameSettings = {
  guessTimeSeconds: 30,
}
