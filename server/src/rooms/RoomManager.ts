import type { GameRoom, GameSettings, Player, RoundResultsPayload, SubmitAnswersPayload } from '@spot-the-song/shared'
import { DEFAULT_GAME_SETTINGS, validateGameSettings } from '@spot-the-song/shared'
import {
  allConnectedSubmitted,
  resetRoundRuntime,
  scoreRound,
  storeAnswer,
  syncCurrentRoundPublic,
  toPublicRoom,
} from '../game/allInGame.js'
import {
  clearRoundTimer,
  createRoomRuntime,
  pickRandomTrack,
  type RoomRuntime,
  toPublicTrack,
} from '../game/roomRuntime.js'
import { resolveMusicImport } from '../music/resolveMusicImport.js'
import { generateRoomCode, isValidRoomCode, normalizeRoomCode } from './code.js'
import { generateId, generateSessionToken } from './id.js'

const DISCONNECT_GRACE_MS = 30_000
const MAX_PLAYERS = 12
const ROUND_INTRO_MS = 2000

export type SessionRecord = {
  sessionToken: string
  playerId: string
  roomId: string
}

export type RoomActionResult =
  | { ok: true; room: GameRoom; player: Player; sessionToken: string }
  | { ok: false; message: string }

export type SimpleResult =
  | { ok: true; room: GameRoom; roundResults?: RoundResultsPayload }
  | { ok: false; message: string }

export type RoomEmitHandlers = {
  onRoomUpdated: (room: GameRoom) => void
  onRoundResults: (roomId: string, payload: RoundResultsPayload) => void
}

export class RoomManager {
  private rooms = new Map<string, GameRoom>()
  private runtimes = new Map<string, RoomRuntime>()
  private codeToRoomId = new Map<string, string>()
  private sessions = new Map<string, SessionRecord>()
  private disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private emitHandlers: RoomEmitHandlers | null = null

  setEmitHandlers(handlers: RoomEmitHandlers): void {
    this.emitHandlers = handlers
  }

  async createRoom(
    playerName: string,
    settingsPartial?: Partial<GameSettings>,
    spotifyUrl?: string,
  ): Promise<RoomActionResult> {
    const trimmedName = playerName.trim()
    if (!trimmedName) {
      return { ok: false, message: 'Enter a player name first.' }
    }

    const settings: GameSettings = {
      ...DEFAULT_GAME_SETTINGS,
      ...settingsPartial,
    }

    if (settings.playMode === 'all-in') {
      const validationError = validateGameSettings(settings)
      if (validationError) {
        return { ok: false, message: validationError }
      }
    }

    let musicImport
    try {
      musicImport = await resolveMusicImport(spotifyUrl)
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to load music.',
      }
    }

    if (musicImport.tracks.length === 0) {
      return { ok: false, message: 'No tracks available for this game.' }
    }

    if (musicImport.tracks.length < settings.roundCount) {
      return {
        ok: false,
        message: `Only ${musicImport.tracks.length} tracks available — lower the round count.`,
      }
    }

    const code = this.generateUniqueCode()
    const roomId = generateId('room')
    const playerId = generateId('player')
    const sessionToken = generateSessionToken()

    const player = this.buildPlayer(playerId, trimmedName, true)

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

    const runtime = createRoomRuntime(musicImport.tracks)
    runtime.playlistName = musicImport.name
    runtime.musicSource = musicImport.source

    this.rooms.set(roomId, room)
    this.runtimes.set(roomId, runtime)
    this.codeToRoomId.set(code, roomId)
    this.sessions.set(sessionToken, { sessionToken, playerId, roomId })

    return { ok: true, room: this.getPublicRoom(roomId)!, player, sessionToken }
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

    return { ok: true, room: this.getPublicRoom(roomId)!, player, sessionToken }
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

    return { ok: true, room: this.getPublicRoom(session.roomId)!, player, sessionToken }
  }

  startGame(roomId: string, hostPlayerId: string): SimpleResult {
    const room = this.rooms.get(roomId)
    if (!room) return { ok: false, message: 'Room not found.' }

    if (room.hostPlayerId !== hostPlayerId) {
      return { ok: false, message: 'Only the host can start the game.' }
    }

    if (room.status !== 'lobby') {
      return { ok: false, message: 'Game has already started.' }
    }

    if (room.settings.playMode !== 'all-in') {
      return { ok: false, message: 'Only All In mode is playable in this build.' }
    }

    const runtime = this.runtimes.get(roomId)
    if (!runtime || runtime.trackPool.length < room.settings.roundCount) {
      return {
        ok: false,
        message: 'Not enough tracks for this many rounds. Lower the round count.',
      }
    }

    room.status = 'how-to-play'
    runtime.howToPlayAcks.clear()

    return { ok: true, room: this.getPublicRoom(roomId)! }
  }

  ackHowToPlay(roomId: string, playerId: string): SimpleResult {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime) return { ok: false, message: 'Room not found.' }

    if (room.status !== 'how-to-play') {
      return { ok: false, message: 'Not waiting for ready players.' }
    }

    if (!room.players.some((player) => player.id === playerId)) {
      return { ok: false, message: 'You are not in this room.' }
    }

    runtime.howToPlayAcks.add(playerId)

    const connectedIds = room.players.filter((player) => player.connected).map((player) => player.id)
    const allReady = connectedIds.every((id) => runtime.howToPlayAcks.has(id))

    if (allReady) {
      return this.beginFirstRound(roomId)
    }

    return { ok: true, room: this.getPublicRoom(roomId)! }
  }

  submitAnswers(
    roomId: string,
    playerId: string,
    answers: SubmitAnswersPayload,
  ): SimpleResult {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime) return { ok: false, message: 'Room not found.' }

    if (room.status !== 'playing' || room.currentRound?.phase !== 'answering') {
      return { ok: false, message: 'Not accepting answers right now.' }
    }

    if (runtime.roundAnswers.has(playerId)) {
      return { ok: false, message: 'You already submitted.' }
    }

    storeAnswer(runtime, playerId, answers, Date.now())
    syncCurrentRoundPublic(room, runtime)

    if (allConnectedSubmitted(room, runtime)) {
      return this.finishRound(roomId)
    }

    return { ok: true, room: this.getPublicRoom(roomId)! }
  }

  continueAfterResults(roomId: string, hostPlayerId: string): SimpleResult {
    const room = this.rooms.get(roomId)
    if (!room) return { ok: false, message: 'Room not found.' }

    if (room.hostPlayerId !== hostPlayerId) {
      return { ok: false, message: 'Only the host can continue.' }
    }

    if (room.status !== 'round-results') {
      return { ok: false, message: 'Not showing round results.' }
    }

    const nextIndex = (room.currentRound?.index ?? 0) + 1
    if (nextIndex > room.settings.roundCount) {
      room.status = 'final-results'
      room.currentRound = null
      return { ok: true, room: this.getPublicRoom(roomId)! }
    }

    return this.startRound(roomId, nextIndex)
  }

  playAgain(roomId: string, hostPlayerId: string): SimpleResult {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime) return { ok: false, message: 'Room not found.' }

    if (room.hostPlayerId !== hostPlayerId) {
      return { ok: false, message: 'Only the host can restart.' }
    }

    if (room.status !== 'final-results') {
      return { ok: false, message: 'Game is not finished.' }
    }

    for (const player of room.players) {
      room.scores[player.id] = 0
    }

    runtime.usedTrackIds = []
    runtime.lastRoundResults = null
    runtime.howToPlayAcks.clear()
    resetRoundRuntime(runtime)
    clearRoundTimer(runtime)

    room.status = 'how-to-play'
    room.currentRound = null

    return { ok: true, room: this.getPublicRoom(roomId)! }
  }

  markDisconnected(playerId: string, roomId: string): GameRoom | null {
    const room = this.rooms.get(roomId)
    if (!room) return null

    const player = room.players.find((entry) => entry.id === playerId)
    if (!player) return this.getPublicRoom(roomId)

    player.connected = false

    this.clearDisconnectTimer(playerId)
    const timer = setTimeout(() => {
      this.removePlayer(playerId, roomId)
    }, DISCONNECT_GRACE_MS)
    this.disconnectTimers.set(playerId, timer)

    return this.getPublicRoom(roomId)
  }

  removePlayer(playerId: string, roomId: string): GameRoom | null {
    const room = this.rooms.get(roomId)
    if (!room) return null

    this.clearDisconnectTimer(playerId)

    const wasHost = room.hostPlayerId === playerId
    room.players = room.players.filter((entry) => entry.id !== playerId)
    delete room.scores[playerId]

    const runtime = this.runtimes.get(roomId)
    runtime?.roundAnswers.delete(playerId)
    runtime?.howToPlayAcks.delete(playerId)

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

    if (room.status === 'playing' && runtime && allConnectedSubmitted(room, runtime)) {
      void this.finishRound(roomId)
    }

    return this.getPublicRoom(roomId)
  }

  leaveRoom(playerId: string, roomId: string): GameRoom | null {
    return this.removePlayer(playerId, roomId)
  }

  getPublicRoom(roomId: string): GameRoom | null {
    const room = this.rooms.get(roomId)
    if (!room) return null
    return toPublicRoom(room, this.runtimes.get(roomId))
  }

  getRoomByCode(code: string): GameRoom | undefined {
    const roomId = this.codeToRoomId.get(normalizeRoomCode(code))
    if (!roomId) return undefined
    return this.getPublicRoom(roomId) ?? undefined
  }

  getSession(sessionToken: string): SessionRecord | undefined {
    return this.sessions.get(sessionToken)
  }

  getLastRoundResults(roomId: string): RoundResultsPayload | null {
    return this.runtimes.get(roomId)?.lastRoundResults ?? null
  }

  clearDisconnectTimer(playerId: string): void {
    const timer = this.disconnectTimers.get(playerId)
    if (timer) {
      clearTimeout(timer)
      this.disconnectTimers.delete(playerId)
    }
  }

  private beginFirstRound(roomId: string): SimpleResult {
    return this.startRound(roomId, 1)
  }

  private startRound(roomId: string, roundIndex: number): SimpleResult {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime) return { ok: false, message: 'Room not found.' }

    clearRoundTimer(runtime)
    resetRoundRuntime(runtime)

    const track = pickRandomTrack(runtime)
    if (!track) {
      room.status = 'final-results'
      room.currentRound = null
      return { ok: true, room: this.getPublicRoom(roomId)! }
    }

    const guessTimerMs = (room.settings.guessTimerSeconds ?? 30) * 1000
    const now = Date.now()

    room.status = 'playing'
    room.currentRound = {
      index: roundIndex,
      phase: 'round-intro',
      activePlayerId: null,
      trackId: track.id,
      endsAt: null,
      roundTrack: toPublicTrack(track),
      submittedPlayerIds: [],
    }

    setTimeout(() => {
      const liveRoom = this.rooms.get(roomId)
      const liveRuntime = this.runtimes.get(roomId)
      if (!liveRoom || !liveRuntime || !liveRoom.currentRound) return
      if (liveRoom.status !== 'playing') return

      liveRuntime.roundStartedAt = Date.now()
      liveRoom.currentRound.phase = 'answering'
      liveRoom.currentRound.endsAt = Date.now() + guessTimerMs
      syncCurrentRoundPublic(liveRoom, liveRuntime)

      this.emitHandlers?.onRoomUpdated(this.getPublicRoom(roomId)!)

      liveRuntime.roundTimer = setTimeout(() => {
        void this.finishRound(roomId)
      }, guessTimerMs)
    }, ROUND_INTRO_MS)

    return { ok: true, room: this.getPublicRoom(roomId)! }
  }

  private finishRound(roomId: string): SimpleResult {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime || !room.currentRound) {
      return { ok: false, message: 'No active round.' }
    }

    clearRoundTimer(runtime)

    const endsAt = room.currentRound.endsAt ?? Date.now()
    room.currentRound.phase = 'reveal'
    room.currentRound.endsAt = null

    const roundResults = scoreRound(room, runtime, endsAt)
    room.status = 'round-results'

    const publicRoom = this.getPublicRoom(roomId)!
    this.emitHandlers?.onRoomUpdated(publicRoom)
    if (roundResults) {
      this.emitHandlers?.onRoundResults(roomId, roundResults)
    }

    return { ok: true, room: publicRoom, roundResults: roundResults ?? undefined }
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
    const nextHost = room.players.find((player) => player.connected) ?? room.players[0]
    if (!nextHost) return

    room.hostPlayerId = nextHost.id
    for (const player of room.players) {
      player.isHost = player.id === nextHost.id
    }
  }

  private deleteRoom(room: GameRoom): void {
    const runtime = this.runtimes.get(room.id)
    if (runtime) {
      clearRoundTimer(runtime)
    }
    this.rooms.delete(room.id)
    this.runtimes.delete(room.id)
    this.codeToRoomId.delete(room.code)
  }
}

export const roomManager = new RoomManager()
