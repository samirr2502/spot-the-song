import type { Player } from './player.js'
import type { Track } from './track.js'

export type PlayMode = 'all-in' | 'turns'

export type TurnGame = 'guess' | 'sing' | 'timeline'

export type GuessFields = {
  title: boolean
  artist: boolean
  album: boolean
  year: boolean
}

export type GameSettings = {
  playMode: PlayMode
  turnGame?: TurnGame
  guessFields: GuessFields
  roundCount: number
  clipDurationSeconds: number
  guessTimerSeconds?: number
  singTimerSeconds?: number
}

export type RoomStatus =
  | 'lobby'
  | 'how-to-play'
  | 'playing'
  | 'round-results'
  | 'final-results'
  | 'closed'

export type RoundPhase =
  | 'round-intro'
  | 'playing'
  | 'answering'
  | 'voting'
  | 'rating'
  | 'reveal'

export type CurrentRound = {
  index: number
  phase: RoundPhase
  activePlayerId: string | null
  trackId: string | null
  endsAt: number | null
}

export type GameRoom = {
  id: string
  code: string
  hostPlayerId: string
  players: Player[]
  status: RoomStatus
  settings: GameSettings
  trackPool: Track[]
  currentRound: CurrentRound | null
  scores: Record<string, number>
}

export const DEFAULT_GUESS_FIELDS: GuessFields = {
  title: true,
  artist: true,
  album: false,
  year: false,
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  playMode: 'all-in',
  guessFields: DEFAULT_GUESS_FIELDS,
  roundCount: 5,
  clipDurationSeconds: 15,
  guessTimerSeconds: 30,
  singTimerSeconds: 45,
}
