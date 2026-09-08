import type {
  HostClipPlayPayload,
  RoundAnsweringPayload,
  RoundClipEndedPayload,
  RoundRevealPayload,
  RoundStartedPayload,
  SpotifyPlaybackErrorPayload,
  SpotifyPlaybackStartedPayload,
  SpotifyPlayTrackPayload,
  SpotifyPlayerReadyPayload,
} from './spotifyEvents.js'

export type {
  HostClipPlayPayload,
  RoundAnsweringPayload,
  RoundClipEndedPayload,
  RoundRevealPayload,
  RoundStartedPayload,
  SpotifyPlaybackErrorPayload,
  SpotifyPlaybackStartedPayload,
  SpotifyPlayTrackPayload,
  SpotifyPlayerReadyPayload,
} from './spotifyEvents.js'
import type { GameSettings, GameRoom } from '../types/game.js'
import type { PlaceCardPayload, TimelineBonusPayload } from '../types/timeline.js'
import type { RatingPayload } from '../types/rating.js'
import type { RoundResultsPayload, SubmitAnswersPayload } from '../types/round.js'
import type { VotePayload } from '../types/voting.js'

export type RoomSessionPayload = {
  playerId: string
  sessionToken: string
  roomCode: string
}

export type CreateRoomResult =
  | { ok: true; code: string; playerId: string; sessionToken: string }
  | { ok: false; message: string }

export type JoinRoomResult =
  | { ok: true; code: string; playerId: string; sessionToken: string }
  | { ok: false; message: string }

export type ActionResult = { ok: true } | { ok: false; message: string }

export type RoomStateActionResult = { ok: true; room: GameRoom } | { ok: false; message: string }

export type ServerToClientEvents = {
  'server:connected': (payload: { serverTime: number }) => void
  'server:room-state': (room: GameRoom) => void
  'server:player-joined': (payload: { playerId: string }) => void
  'server:player-left': (payload: { playerId: string }) => void
  'server:phase-changed': (payload: { status: GameRoom['status'] }) => void
  'server:round-results': (payload: RoundResultsPayload) => void
  'server:host-play-clip': (payload: HostClipPlayPayload) => void
  'server:spotify-play-track': (payload: SpotifyPlayTrackPayload) => void
  'server:round-clip-ended': (payload: RoundClipEndedPayload) => void
  'server:round-started': (payload: RoundStartedPayload) => void
  'server:round-answering': (payload: RoundAnsweringPayload) => void
  'server:round-reveal': (payload: RoundRevealPayload) => void
  'server:room-closed': (payload: { message: string }) => void
  'server:error': (payload: { message: string }) => void
}

export type ClientToServerEvents = {
  'client:ping': (callback: (payload: { serverTime: number }) => void) => void
  'client:create-room': (
    payload: { playerName: string; settings?: GameSettings; spotifyUrl?: string },
    callback: (result: CreateRoomResult) => void,
  ) => void
  'client:join-room': (
    payload: { code: string; playerName: string },
    callback: (result: JoinRoomResult) => void,
  ) => void
  'client:reconnect-room': (
    payload: { sessionToken: string },
    callback: (result: ActionResult) => void,
  ) => void
  'client:start-game': (callback: (result: ActionResult) => void) => void
  'client:ack-how-to-play': (callback: (result: ActionResult) => void) => void
  'client:submit-answers': (
    payload: SubmitAnswersPayload,
    callback: (result: ActionResult) => void,
  ) => void
  'client:submit-votes': (
    payload: VotePayload,
    callback: (result: ActionResult) => void,
  ) => void
  'client:submit-rating': (
    payload: RatingPayload,
    callback: (result: ActionResult) => void,
  ) => void
  'client:place-card': (
    payload: PlaceCardPayload,
    callback: (result: ActionResult) => void,
  ) => void
  'client:submit-timeline-bonus': (
    payload: TimelineBonusPayload,
    callback: (result: ActionResult) => void,
  ) => void
  'client:continue-after-results': (callback: (result: ActionResult) => void) => void
  'client:host-start-rating': (callback: (result: ActionResult) => void) => void
  'client:turn-guess-done': (callback: (result: ActionResult) => void) => void
  'client:spotify-player-ready': (
    payload: SpotifyPlayerReadyPayload,
    callback?: (result: ActionResult) => void,
  ) => void
  'client:spotify-playback-started': (
    payload: SpotifyPlaybackStartedPayload,
    callback?: (result: ActionResult) => void,
  ) => void
  'client:spotify-playback-error': (
    payload: SpotifyPlaybackErrorPayload,
    callback?: (result: ActionResult) => void,
  ) => void
  'client:spotify-retry-playback': (callback: (result: ActionResult) => void) => void
  'client:play-again': (callback: (result: ActionResult) => void) => void
  'client:return-to-lobby': (callback: (result: RoomStateActionResult) => void) => void
  'client:update-lobby': (
    payload: { settings: GameSettings; spotifyUrl?: string },
    callback: (result: ActionResult) => void,
  ) => void
  'client:leave-room': (callback?: (result: ActionResult) => void) => void
  'client:close-room': (callback?: (result: ActionResult) => void) => void
}

export type InterServerEvents = Record<string, never>

export type SocketData = {
  playerId?: string
  roomId?: string
  sessionToken?: string
}
