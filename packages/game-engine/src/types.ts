export type Song = {
  id: string
  title: string
  artist: string
  album: string
  audioUrl: string
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

export type GamePhase = 'lobby' | 'playing' | 'reveal' | 'finished'

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
}

export const DEFAULT_SETTINGS: GameSettings = {
  guessTimeSeconds: 30,
}
