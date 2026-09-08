import type { GameRoom } from '../types/game.js'

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

export type ServerToClientEvents = {
  'server:connected': (payload: { serverTime: number }) => void
  'server:room-state': (room: GameRoom) => void
  'server:player-joined': (payload: { playerId: string }) => void
  'server:player-left': (payload: { playerId: string }) => void
  'server:phase-changed': (payload: { status: GameRoom['status'] }) => void
  'server:error': (payload: { message: string }) => void
}

export type ClientToServerEvents = {
  'client:ping': (callback: (payload: { serverTime: number }) => void) => void
  'client:create-room': (
    payload: { playerName: string; playMode?: GameRoom['settings']['playMode'] },
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
  'client:leave-room': (callback?: (result: ActionResult) => void) => void
}

export type InterServerEvents = Record<string, never>

export type SocketData = {
  playerId?: string
  roomId?: string
  sessionToken?: string
}
