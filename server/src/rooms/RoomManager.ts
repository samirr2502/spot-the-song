import type { GameRoom, GameSettings, Player } from '@spot-the-song/shared'
import { DEFAULT_GAME_SETTINGS } from '@spot-the-song/shared'
import { generateRoomCode, isValidRoomCode, normalizeRoomCode } from './code.js'
import { generateId, generateSessionToken } from './id.js'

const DISCONNECT_GRACE_MS = 30_000
const MAX_PLAYERS = 12

export type SessionRecord = {
  sessionToken: string
  playerId: string
  roomId: string
}

export type RoomActionResult =
  | { ok: true; room: GameRoom; player: Player; sessionToken: string }
  | { ok: false; message: string }

export type SimpleResult = { ok: true; room: GameRoom } | { ok: false; message: string }

export class RoomManager {
  private rooms = new Map<string, GameRoom>()
  private codeToRoomId = new Map<string, string>()
  private sessions = new Map<string, SessionRecord>()
  private disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>()

  createRoom(playerName: string, settingsPartial?: Partial<GameSettings>): RoomActionResult {
    const trimmedName = playerName.trim()
    if (!trimmedName) {
      return { ok: false, message: 'Enter a player name first.' }
    }

    const code = this.generateUniqueCode()
    const roomId = generateId('room')
    const playerId = generateId('player')
    const sessionToken = generateSessionToken()

    const player = this.buildPlayer(playerId, trimmedName, true)
    const settings: GameSettings = {
      ...DEFAULT_GAME_SETTINGS,
      ...settingsPartial,
    }

    const room: GameRoom = {
      id: roomId,
      code,
      hostPlayerId: playerId,
      players: [player],
      status: 'lobby',
      settings,
      trackPool: [],
      currentRound: null,
      scores: { [playerId]: 0 },
    }

    this.rooms.set(roomId, room)
    this.codeToRoomId.set(code, roomId)
    this.sessions.set(sessionToken, { sessionToken, playerId, roomId })

    return { ok: true, room, player, sessionToken }
  }

  joinRoom(codeInput: string, playerName: string): RoomActionResult {
    const trimmedName = playerName.trim()
    if (!trimmedName) {
      return { ok: false, message: 'Enter a player name first.' }
    }

    const code = normalizeRoomCode(codeInput)
    if (!isValidRoomCode(code)) {
      return { ok: false, message: 'Enter a valid 6-character room code.' }
    }

    const roomId = this.codeToRoomId.get(code)
    if (!roomId) {
      return { ok: false, message: 'Room not found. Check the code and try again.' }
    }

    const room = this.rooms.get(roomId)
    if (!room) {
      return { ok: false, message: 'Room not found. Check the code and try again.' }
    }

    if (room.status !== 'lobby') {
      return { ok: false, message: 'This game has already started.' }
    }

    if (room.players.length >= MAX_PLAYERS) {
      return { ok: false, message: 'This room is full.' }
    }

    const playerId = generateId('player')
    const sessionToken = generateSessionToken()
    const player = this.buildPlayer(playerId, trimmedName, false)

    room.players.push(player)
    room.scores[playerId] = 0
    this.sessions.set(sessionToken, { sessionToken, playerId, roomId })

    return { ok: true, room, player, sessionToken }
  }

  reconnect(sessionToken: string): RoomActionResult {
    const session = this.sessions.get(sessionToken)
    if (!session) {
      return { ok: false, message: 'Session expired. Join the room again.' }
    }

    const room = this.rooms.get(session.roomId)
    if (!room || room.status === 'closed') {
      this.sessions.delete(sessionToken)
      return { ok: false, message: 'Room no longer exists.' }
    }

    const player = room.players.find((entry) => entry.id === session.playerId)
    if (!player) {
      this.sessions.delete(sessionToken)
      return { ok: false, message: 'Player not found in this room.' }
    }

    this.clearDisconnectTimer(session.playerId)
    player.connected = true
    player.isHost = room.hostPlayerId === player.id

    return { ok: true, room, player, sessionToken }
  }

  markDisconnected(playerId: string, roomId: string): GameRoom | null {
    const room = this.rooms.get(roomId)
    if (!room) return null

    const player = room.players.find((entry) => entry.id === playerId)
    if (!player) return room

    player.connected = false

    this.clearDisconnectTimer(playerId)
    const timer = setTimeout(() => {
      this.removePlayer(playerId, roomId)
    }, DISCONNECT_GRACE_MS)
    this.disconnectTimers.set(playerId, timer)

    return room
  }

  removePlayer(playerId: string, roomId: string): GameRoom | null {
    const room = this.rooms.get(roomId)
    if (!room) return null

    this.clearDisconnectTimer(playerId)

    const wasHost = room.hostPlayerId === playerId
    room.players = room.players.filter((entry) => entry.id !== playerId)
    delete room.scores[playerId]

    for (const [token, session] of this.sessions.entries()) {
      if (session.playerId === playerId) {
        this.sessions.delete(token)
      }
    }

    if (room.players.length === 0) {
      this.deleteRoom(room)
      return null
    }

    if (wasHost) {
      this.promoteHost(room)
    }

    return room
  }

  leaveRoom(playerId: string, roomId: string): GameRoom | null {
    return this.removePlayer(playerId, roomId)
  }

  startGame(roomId: string, hostPlayerId: string): SimpleResult {
    const room = this.rooms.get(roomId)
    if (!room) {
      return { ok: false, message: 'Room not found.' }
    }

    if (room.hostPlayerId !== hostPlayerId) {
      return { ok: false, message: 'Only the host can start the game.' }
    }

    if (room.status !== 'lobby') {
      return { ok: false, message: 'Game has already started.' }
    }

    if (room.players.filter((player) => player.connected).length < 1) {
      return { ok: false, message: 'Need at least one connected player.' }
    }

    room.status = 'how-to-play'
    return { ok: true, room }
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId)
  }

  getRoomByCode(code: string): GameRoom | undefined {
    const roomId = this.codeToRoomId.get(normalizeRoomCode(code))
    if (!roomId) return undefined
    return this.rooms.get(roomId)
  }

  getSession(sessionToken: string): SessionRecord | undefined {
    return this.sessions.get(sessionToken)
  }

  clearDisconnectTimer(playerId: string): void {
    const timer = this.disconnectTimers.get(playerId)
    if (timer) {
      clearTimeout(timer)
      this.disconnectTimers.delete(playerId)
    }
  }

  private buildPlayer(id: string, name: string, isHost: boolean): Player {
    return {
      id,
      name,
      isHost,
      connected: true,
      avatarSeed: id,
    }
  }

  private generateUniqueCode(): string {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = generateRoomCode()
      if (!this.codeToRoomId.has(code)) {
        return code
      }
    }
    throw new Error('Failed to generate a unique room code')
  }

  private promoteHost(room: GameRoom): void {
    const nextHost =
      room.players.find((player) => player.connected) ??
      room.players[0]

    if (!nextHost) return

    room.hostPlayerId = nextHost.id
    for (const player of room.players) {
      player.isHost = player.id === nextHost.id
    }
  }

  private deleteRoom(room: GameRoom): void {
    this.rooms.delete(room.id)
    this.codeToRoomId.delete(room.code)
  }
}

export const roomManager = new RoomManager()
