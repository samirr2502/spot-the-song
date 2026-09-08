import type { Player } from './player.js'
import type { RoundTrackPublic } from './round.js'
import type { TimelineCardPublic } from './timeline.js'
import type { Track } from './track.js'

export type PlayMode = 'all-in' | 'turns'

export type TurnGame = 'guess' | 'sing' | 'timeline'

export type GuessFields = {
  title: boolean
  artist: boolean
  album: boolean
  year: boolean
}

export type PlaybackMode = 'preview' | 'spotify-full'

export type GameSettings = {
  playMode: PlayMode
  turnGame?: TurnGame
  guessFields: GuessFields
  roundCount: number
  /** Timeline mode: total cards on timeline (including starter) needed to win. */
  cardsToWin?: number
  /** Timeline mode: seconds for opponents to challenge after placement lock. */
  challengeTimerSeconds?: number
  clipDurationSeconds: number
  guessTimerSeconds?: number
  singTimerSeconds?: number
  playbackMode?: PlaybackMode
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
  | 'clip-playing'
  | 'playing'
  | 'answering'
  | 'challenge'
  | 'voting'
  | 'rating'
  | 'reveal'

export type MusicSource = 'spotify' | 'mock'

export type ChallengeTrack = {
  title: string
  artist: string
  album: string
  year: number | null
  artworkUrl?: string
}

export type CurrentRound = {
  index: number
  phase: RoundPhase
  activePlayerId: string | null
  trackId: string | null
  endsAt: number | null
  /** When the song clip ends — speed bonus window for All In. */
  clipEndsAt?: number | null
  roundTrack?: RoundTrackPublic | null
  /** Title/artist reveal for judges during turn-guess voting or sing-along rating. */
  challengeTrack?: ChallengeTrack | null
  /** Blind Spotify link for the active singer — no title in the UI. */
  performerSpotifyUrl?: string
  submittedPlayerIds?: string[]
  /** Timeline challenge window end (epoch ms). */
  challengeEndsAt?: number | null
  /** Timeline: player who spent coins to challenge this placement. */
  challengerPlayerId?: string | null
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
  musicSource?: MusicSource
  currentRound: CurrentRound | null
  scores: Record<string, number>
  readyPlayerIds?: string[]
  timelines?: Record<string, TimelineCardPublic[]>
  /** Timeline mode: coin balance per player id. */
  coins?: Record<string, number>
}

export const DEFAULT_GUESS_FIELDS: GuessFields = {
  title: true,
  artist: true,
  album: false,
  year: false,
}

export const DEFAULT_TIMELINE_CARDS_TO_WIN = 5
export const DEFAULT_TIMELINE_CHALLENGE_TIMER_SECONDS = 15

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  playMode: 'all-in',
  guessFields: DEFAULT_GUESS_FIELDS,
  roundCount: 5,
  cardsToWin: DEFAULT_TIMELINE_CARDS_TO_WIN,
  challengeTimerSeconds: DEFAULT_TIMELINE_CHALLENGE_TIMER_SECONDS,
  clipDurationSeconds: 30,
  guessTimerSeconds: 0,
  singTimerSeconds: 45,
  playbackMode: 'preview',
}
