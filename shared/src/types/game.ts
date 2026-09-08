import type { Player } from './player.js'
import type { RoundTrackPublic } from './round.js'
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
  roundTrack?: RoundTrackPublic | null
  submittedPlayerIds?: string[]
}

export type GameRoom = {
  id: string
  code: string
  hostPlayerId: string
  players: Player[]
  status: RoomStatus
  settings: GameSettings
  /** Empty on client during play — use trackPoolSize instead. */
  trackPool: Track[]
  trackPoolSize?: number
  playlistName?: string
  playableTrackCount?: number
  currentRound: CurrentRound | null
  scores: Record<string, number>
  readyPlayerIds?: string[]
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
