import type { GameRoom, GameSettings, HostClipPlayPayload, PlaceCardPayload, Player, RatingPayload, RoundResultsPayload, SpotifyPlayTrackPayload, RoundClipEndedPayload, SubmitAnswersPayload, TimelineBonusPayload, VotePayload } from '@spot-the-song/shared'
import { DEFAULT_GAME_SETTINGS, computeCombinedRoundWindowFromSettings, fillMissingRatings, fillMissingVotes, getSpotifyCatalogUrlError, mergeVotePayloadWithDefaults, resolveRatingOrDefault, validateGameSettings, validateSingAlongSettings, validateTimelineSettings } from '@spot-the-song/shared'
import {
  resetRoundRuntime,
  scoreRound,
  storeAnswer,
  syncCurrentRoundPublic,
  toPublicRoom,
} from '../game/allInGame.js'
import {
  allTurnVotesSubmitted,
  scoreTurnGuessRoundResults,
  storeVote,
  validateVotePayload,
} from '../game/turnGuessGame.js'
import {
  allSingRatingsSubmitted,
  scoreSingAlongRoundResults,
  storeRating,
  validateRatingPayload,
} from '../game/singAlongGame.js'
import {
  bonusFieldsEnabled,
  canFinishTimelineTurn,
  getActivePlayerForTurn,
  initializePlayerTimelines,
  scoreTimelineRoundResults,
  storeTimelineBonus,
  storeTimelinePlacement,
  validateInsertIndex,
  toPublicTimelines,
} from '../game/timelineGame.js'
import {
  clearRoundTimer,
  createRoomRuntime,
  pickRandomTrack,
  type RoomRuntime,
  toMinimalRoundTrack,
} from '../game/roomRuntime.js'
import {
  buildHostClipPlayPayload,
  buildSpotifyPlayPayload,
  clipDurationMs,
  usesClipPhase,
} from '../game/roundClip.js'
import { countSpotifyTracks, MIN_SPOTIFY_TRACKS } from '../music/types.js'
import { resolveMusicImport } from '../music/resolveMusicImport.js'
import { generateRoomCode, isValidRoomCode, normalizeRoomCode } from './code.js'
import { generateId, generateSessionToken } from './id.js'

const DISCONNECT_GRACE_MS = 30_000
const MAX_PLAYERS = 12
const ROUND_INTRO_MS = 2000
const VOTING_SECONDS = 15
const RATING_SECONDS = 20

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
  onHostPlayClip: (roomId: string, hostPlayerId: string, payload: HostClipPlayPayload) => void
  onSpotifyPlayTrack: (roomId: string, hostPlayerId: string, payload: SpotifyPlayTrackPayload) => void
  onRoundClipEnded: (roomId: string, payload: RoundClipEndedPayload) => void
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
      playbackMode:
        settingsPartial?.playbackMode === 'spotify-full' ? 'spotify-full' : 'preview',
    }

    if (settings.playMode === 'turns' && settings.turnGame === 'sing') {
      settings.playbackMode = 'spotify-full'
    }

    if (
      settings.playMode === 'all-in' ||
      (settings.playMode === 'turns' && settings.turnGame === 'guess')
    ) {
      const validationError = validateGameSettings(settings)
      if (validationError) {
        return { ok: false, message: validationError }
      }
    }

    if (settings.playMode === 'turns' && settings.turnGame === 'sing') {
      const validationError = validateSingAlongSettings(settings)
      if (validationError) {
        return { ok: false, message: validationError }
      }
    }

    if (settings.playMode === 'turns' && settings.turnGame === 'timeline') {
      const validationError = validateTimelineSettings(settings)
      if (validationError) {
        return { ok: false, message: validationError }
      }
    }

    let musicImport
    const trimmedUrl = spotifyUrl?.trim()
    if (!trimmedUrl) {
      return {
        ok: false,
        message: 'Paste a Spotify playlist or album link before creating a lobby.',
      }
    }

    const urlError = getSpotifyCatalogUrlError(trimmedUrl)
    if (urlError) {
      return { ok: false, message: urlError }
    }

    try {
      musicImport = await resolveMusicImport(trimmedUrl)
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to load music.',
      }
    }

    if (musicImport.source !== 'spotify') {
      return {
        ok: false,
        message: 'Import a Spotify playlist or album to create a lobby.',
      }
    }

    if (musicImport.tracks.length === 0) {
      return {
        ok: false,
        message: 'No tracks found in this playlist. Try another link.',
      }
    }

    const spotifyTrackCount = countSpotifyTracks(musicImport.tracks)
    if (musicImport.source === 'spotify' && spotifyTrackCount < MIN_SPOTIFY_TRACKS) {
      return {
        ok: false,
        message: 'No playable Spotify tracks in this link. Try another playlist or album.',
      }
    }

    if (musicImport.tracks.length < settings.roundCount) {
      return {
        ok: false,
        message: `Only ${musicImport.tracks.length} tracks available — lower the round count.`,
      }
    }

    if (
      settings.playMode === 'turns' &&
      settings.turnGame === 'timeline' &&
      musicImport.tracks.length < settings.roundCount + 1
    ) {
      return {
        ok: false,
        message: `Need at least ${settings.roundCount + 1} tracks for timeline rounds and a starter card.`,
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

    if (!this.isPlayableMode(room)) {
      return { ok: false, message: 'This game mode is not available yet.' }
    }

    const runtime = this.runtimes.get(roomId)
    if (!runtime || runtime.trackPool.length < room.settings.roundCount) {
      return {
        ok: false,
        message: 'Not enough tracks for this many rounds. Lower the round count.',
      }
    }

    if (
      this.isTimeline(room) &&
      runtime.trackPool.length < room.settings.roundCount + room.players.length
    ) {
      return {
        ok: false,
        message: `Need at least ${room.settings.roundCount + room.players.length} tracks for timeline starter cards and rounds.`,
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

    if (room.status !== 'playing') {
      return { ok: false, message: 'Not accepting answers right now.' }
    }

    if (room.settings.playMode !== 'all-in') {
      return { ok: false, message: 'Answers are not submitted in this mode.' }
    }

    if (
      room.currentRound?.phase !== 'answering' &&
      !(room.settings.playMode === 'all-in' && room.currentRound?.phase === 'clip-playing')
    ) {
      return { ok: false, message: 'Not accepting answers right now.' }
    }

    if (runtime.roundAnswers.has(playerId)) {
      return { ok: false, message: 'You already submitted.' }
    }

    storeAnswer(runtime, playerId, answers, Date.now())
    syncCurrentRoundPublic(room, runtime)

    return { ok: true, room: this.getPublicRoom(roomId)! }
  }

  submitVotes(roomId: string, playerId: string, votes: VotePayload): SimpleResult {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime) return { ok: false, message: 'Room not found.' }

    if (!this.isTurnGuess(room)) {
      return { ok: false, message: 'Voting is not active.' }
    }

    if (room.status !== 'playing' || room.currentRound?.phase !== 'voting') {
      return { ok: false, message: 'Not accepting votes right now.' }
    }

    if (room.currentRound.activePlayerId === playerId) {
      return { ok: false, message: 'The active player cannot vote on themselves.' }
    }

    if (runtime.roundVotes.has(playerId)) {
      return { ok: false, message: 'You already submitted your votes.' }
    }

    const mergedVotes = mergeVotePayloadWithDefaults(votes, room.settings.guessFields)
    const validationError = validateVotePayload(mergedVotes, room.settings.guessFields)
    if (validationError) {
      return { ok: false, message: validationError }
    }

    storeVote(runtime, playerId, mergedVotes)
    syncCurrentRoundPublic(room, runtime)

    if (allTurnVotesSubmitted(room, runtime)) {
      return this.finishTurnGuessRound(roomId)
    }

    return { ok: true, room: this.getPublicRoom(roomId)! }
  }

  hostStartRating(roomId: string, hostPlayerId: string): SimpleResult {
    const room = this.rooms.get(roomId)
    if (!room) return { ok: false, message: 'Room not found.' }

    if (room.hostPlayerId !== hostPlayerId) {
      return { ok: false, message: 'Only the host can start voting.' }
    }

    if (!this.isSingAlong(room)) {
      return { ok: false, message: 'Rating is not active for this game mode.' }
    }

    if (room.status !== 'playing' || room.currentRound?.phase !== 'playing') {
      return { ok: false, message: 'Not in a performance phase.' }
    }

    this.openSingAlongRating(roomId)
    return { ok: true, room: this.getPublicRoom(roomId)! }
  }

  turnGuessPlayerDone(roomId: string, playerId: string): SimpleResult {
    const room = this.rooms.get(roomId)
    if (!room) return { ok: false, message: 'Room not found.' }

    if (!this.isTurnGuess(room)) {
      return { ok: false, message: 'Not a turn guess round.' }
    }

    if (room.status !== 'playing' || !room.currentRound) {
      return { ok: false, message: 'No active round.' }
    }

    const phase = room.currentRound.phase
    if (phase !== 'playing' && phase !== 'clip-playing') {
      return { ok: false, message: 'Not in the guess phase.' }
    }

    if (room.currentRound.activePlayerId !== playerId) {
      return { ok: false, message: 'Only the active player can finish guessing.' }
    }

    this.openTurnGuessVoting(roomId)
    return { ok: true, room: this.getPublicRoom(roomId)! }
  }

  submitRating(roomId: string, playerId: string, payload: RatingPayload): SimpleResult {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime) return { ok: false, message: 'Room not found.' }

    if (!this.isSingAlong(room)) {
      return { ok: false, message: 'Rating is not active.' }
    }

    if (room.status !== 'playing' || room.currentRound?.phase !== 'rating') {
      return { ok: false, message: 'Not accepting ratings right now.' }
    }

    if (room.currentRound.activePlayerId === playerId) {
      return { ok: false, message: 'The active player cannot rate themselves.' }
    }

    if (runtime.roundRatings.has(playerId)) {
      return { ok: false, message: 'You already submitted your rating.' }
    }

    const rating = resolveRatingOrDefault(payload.rating)
    const validationError = validateRatingPayload({ rating })
    if (validationError) {
      return { ok: false, message: validationError }
    }

    storeRating(runtime, playerId, rating)
    syncCurrentRoundPublic(room, runtime)

    if (allSingRatingsSubmitted(room, runtime)) {
      return this.finishSingAlongRound(roomId)
    }

    return { ok: true, room: this.getPublicRoom(roomId)! }
  }

  placeCard(roomId: string, playerId: string, payload: PlaceCardPayload): SimpleResult {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime) return { ok: false, message: 'Room not found.' }

    if (!this.isTimeline(room)) {
      return { ok: false, message: 'Timeline placement is not active.' }
    }

    if (
      room.status !== 'playing' ||
      (room.currentRound?.phase !== 'answering' && room.currentRound?.phase !== 'clip-playing')
    ) {
      return { ok: false, message: 'Not accepting placements right now.' }
    }

    if (room.currentRound.activePlayerId !== playerId) {
      return { ok: false, message: 'Only the active player can place a card.' }
    }

    if (runtime.timelinePlacementLocked) {
      return { ok: false, message: 'You already placed this card.' }
    }

    const validationError = validateInsertIndex(room, runtime, playerId, payload.insertIndex)
    if (validationError) {
      return { ok: false, message: validationError }
    }

    storeTimelinePlacement(runtime, payload.insertIndex)
    syncCurrentRoundPublic(room, runtime)

    if (canFinishTimelineTurn(room, runtime)) {
      return this.finishTimelineRound(roomId)
    }

    return { ok: true, room: this.getPublicRoom(roomId)! }
  }

  submitTimelineBonus(
    roomId: string,
    playerId: string,
    payload: TimelineBonusPayload,
  ): SimpleResult {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime) return { ok: false, message: 'Room not found.' }

    if (!this.isTimeline(room)) {
      return { ok: false, message: 'Timeline bonus guesses are not active.' }
    }

    if (
      room.status !== 'playing' ||
      (room.currentRound?.phase !== 'answering' && room.currentRound?.phase !== 'clip-playing')
    ) {
      return { ok: false, message: 'Not accepting bonus guesses right now.' }
    }

    if (room.currentRound.activePlayerId !== playerId) {
      return { ok: false, message: 'Only the active player can submit bonus guesses.' }
    }

    if (!runtime.timelinePlacementLocked) {
      return { ok: false, message: 'Place the card on your timeline first.' }
    }

    if (runtime.timelineBonusAnswers !== null) {
      return { ok: false, message: 'Bonus guesses already submitted.' }
    }

    if (!bonusFieldsEnabled(room)) {
      return { ok: false, message: 'Bonus guesses are disabled for this game.' }
    }

    storeTimelineBonus(runtime, payload)
    syncCurrentRoundPublic(room, runtime)

    if (canFinishTimelineTurn(room, runtime)) {
      return this.finishTimelineRound(roomId)
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

    this.resetRoomForNewSession(room, runtime)
    room.status = 'how-to-play'

    return { ok: true, room: this.getPublicRoom(roomId)! }
  }

  returnToLobby(roomId: string, hostPlayerId: string): SimpleResult {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime) return { ok: false, message: 'Room not found.' }

    if (room.hostPlayerId !== hostPlayerId) {
      return { ok: false, message: 'Only the host can return to the lobby.' }
    }

    if (room.status !== 'final-results' && room.status !== 'how-to-play') {
      return { ok: false, message: 'The game is already in progress.' }
    }

    this.resetRoomForNewSession(room, runtime)
    room.status = 'lobby'

    return { ok: true, room: this.getPublicRoom(roomId)! }
  }

  async updateLobby(
    roomId: string,
    hostPlayerId: string,
    payload: { settings: GameSettings; spotifyUrl?: string },
  ): Promise<SimpleResult> {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime) return { ok: false, message: 'Room not found.' }

    if (room.hostPlayerId !== hostPlayerId) {
      return { ok: false, message: 'Only the host can change lobby settings.' }
    }

    if (room.status !== 'lobby') {
      return { ok: false, message: 'Settings can only be changed in the lobby.' }
    }

    const settings: GameSettings = {
      ...payload.settings,
      playbackMode:
        payload.settings.playbackMode === 'spotify-full' ? 'spotify-full' : 'preview',
    }

    if (settings.playMode === 'turns' && !settings.turnGame) {
      return { ok: false, message: 'Pick a turn game.' }
    }

    const validationError = this.validateSettings(settings)
    if (validationError) {
      return { ok: false, message: validationError }
    }

    const spotifyUrl = payload.spotifyUrl?.trim()
    if (spotifyUrl) {
      let musicImport
      try {
        musicImport = await resolveMusicImport(spotifyUrl)
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : 'Failed to load music.',
        }
      }

      const musicError = this.validateMusicForSettings(musicImport, settings)
      if (musicError) {
        return { ok: false, message: musicError }
      }

      runtime.trackPool = musicImport.tracks
      runtime.playlistName = musicImport.name
      runtime.musicSource = musicImport.source
      runtime.usedTrackIds = []
    } else {
      const poolError = this.validateTrackPoolForSettings(runtime, room, settings)
      if (poolError) {
        return { ok: false, message: poolError }
      }
    }

    room.settings = settings
    this.resetRoomForNewSession(room, runtime)
    room.status = 'lobby'

    return { ok: true, room: this.getPublicRoom(roomId)! }
  }

  private resetRoomForNewSession(room: GameRoom, runtime: RoomRuntime): void {
    for (const player of room.players) {
      room.scores[player.id] = 0
    }

    runtime.usedTrackIds = []
    runtime.lastRoundResults = null
    runtime.howToPlayAcks.clear()
    runtime.turnRotationIndex = 0
    runtime.playerTimelines.clear()
    resetRoundRuntime(runtime)
    clearRoundTimer(runtime)
    room.currentRound = null
  }

  private validateSettings(settings: GameSettings): string | null {
    if (
      settings.playMode === 'all-in' ||
      (settings.playMode === 'turns' && settings.turnGame === 'guess')
    ) {
      return validateGameSettings(settings)
    }

    if (settings.playMode === 'turns' && settings.turnGame === 'sing') {
      return validateSingAlongSettings(settings)
    }

    if (settings.playMode === 'turns' && settings.turnGame === 'timeline') {
      return validateTimelineSettings(settings)
    }

    return 'This game mode is not available yet.'
  }

  private validateMusicForSettings(
    musicImport: Awaited<ReturnType<typeof resolveMusicImport>>,
    settings: GameSettings,
  ): string | null {
    if (musicImport.tracks.length === 0) {
      return 'No tracks found in this playlist. Try another link.'
    }

    const spotifyTrackCount = countSpotifyTracks(musicImport.tracks)
    if (musicImport.source === 'spotify' && spotifyTrackCount < MIN_SPOTIFY_TRACKS) {
      return 'No playable Spotify tracks in this link. Try another playlist or album.'
    }

    if (musicImport.tracks.length < settings.roundCount) {
      return `Only ${musicImport.tracks.length} tracks available — lower the round count.`
    }

    if (
      settings.playMode === 'turns' &&
      settings.turnGame === 'timeline' &&
      musicImport.tracks.length < settings.roundCount + 1
    ) {
      return `Need at least ${settings.roundCount + 1} tracks for timeline rounds and a starter card.`
    }

    return null
  }

  private validateTrackPoolForSettings(
    runtime: RoomRuntime,
    room: GameRoom,
    settings: GameSettings,
  ): string | null {
    if (runtime.trackPool.length < settings.roundCount) {
      return `Only ${runtime.trackPool.length} tracks available — lower the round count or change the collection.`
    }

    if (
      settings.playMode === 'turns' &&
      settings.turnGame === 'timeline' &&
      runtime.trackPool.length < settings.roundCount + room.players.length
    ) {
      return `Need at least ${settings.roundCount + room.players.length} tracks for timeline starter cards and rounds.`
    }

    return null
  }

  markDisconnected(playerId: string, roomId: string): GameRoom | null {
    const room = this.rooms.get(roomId)
    if (!room) return null

    const player = room.players.find((entry) => entry.id === playerId)
    if (!player) return this.getPublicRoom(roomId)

    player.connected = false

    this.handlePlayerUnavailableMidRound(roomId, playerId)

    this.clearDisconnectTimer(playerId)
    const timer = setTimeout(() => {
      this.removePlayer(playerId, roomId)
    }, DISCONNECT_GRACE_MS)
    this.disconnectTimers.set(playerId, timer)

    const publicRoom = this.getPublicRoom(roomId)
    if (publicRoom) {
      this.emitHandlers?.onRoomUpdated(publicRoom)
    }

    return publicRoom
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
    runtime?.roundVotes.delete(playerId)
    runtime?.roundRatings.delete(playerId)
    runtime?.playerTimelines.delete(playerId)
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
      if (room.currentRound?.phase === 'clip-playing' && runtime) {
        this.emitClipPlaybackForCurrentRound(roomId)
      }
    }

    if (room.status === 'playing' && runtime) {
      this.handlePlayerUnavailableMidRound(roomId, playerId)
    }

    if (room.status === 'playing' && runtime) {
      if (this.isTurnGuess(room) && room.currentRound?.phase === 'voting' && allTurnVotesSubmitted(room, runtime)) {
        void this.finishTurnGuessRound(roomId)
      } else if (this.isSingAlong(room) && room.currentRound?.phase === 'rating' && allSingRatingsSubmitted(room, runtime)) {
        void this.finishSingAlongRound(roomId)
      }
    }

    return this.getPublicRoom(roomId)
  }

  leaveRoom(playerId: string, roomId: string): GameRoom | null {
    return this.removePlayer(playerId, roomId)
  }

  closeRoom(roomId: string, hostPlayerId: string): { ok: true } | { ok: false; message: string } {
    const room = this.rooms.get(roomId)
    if (!room) {
      return { ok: false, message: 'Room not found.' }
    }

    if (room.hostPlayerId !== hostPlayerId) {
      return { ok: false, message: 'Only the host can close the room.' }
    }

    const runtime = this.runtimes.get(roomId)
    if (runtime) {
      clearRoundTimer(runtime)
    }

    for (const player of room.players) {
      this.clearDisconnectTimer(player.id)
      for (const [token, session] of this.sessions.entries()) {
        if (session.playerId === player.id) {
          this.sessions.delete(token)
        }
      }
    }

    this.deleteRoom(room)
    return { ok: true }
  }

  getPublicRoom(roomId: string): GameRoom | null {
    const room = this.rooms.get(roomId)
    if (!room) return null
    const runtime = this.runtimes.get(roomId)
    const publicRoom = toPublicRoom(room, runtime)
    if (runtime && this.isTimeline(room)) {
      publicRoom.timelines = toPublicTimelines(room, runtime)
    }
    return publicRoom
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

  private isPlayableMode(room: GameRoom): boolean {
    return (
      room.settings.playMode === 'all-in' ||
      (room.settings.playMode === 'turns' && room.settings.turnGame === 'guess') ||
      (room.settings.playMode === 'turns' && room.settings.turnGame === 'sing') ||
      (room.settings.playMode === 'turns' && room.settings.turnGame === 'timeline')
    )
  }

  private isTurnGuess(room: GameRoom): boolean {
    return room.settings.playMode === 'turns' && room.settings.turnGame === 'guess'
  }

  private isSingAlong(room: GameRoom): boolean {
    return room.settings.playMode === 'turns' && room.settings.turnGame === 'sing'
  }

  private isTimeline(room: GameRoom): boolean {
    return room.settings.playMode === 'turns' && room.settings.turnGame === 'timeline'
  }

  private beginFirstRound(roomId: string): SimpleResult {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime) return { ok: false, message: 'Room not found.' }

    if (this.isTimeline(room) && runtime.playerTimelines.size === 0) {
      const initError = initializePlayerTimelines(room, runtime)
      if (initError) {
        return { ok: false, message: initError }
      }
    }

    return this.startRound(roomId, 1)
  }

  private startRound(roomId: string, roundIndex: number): SimpleResult {
    const room = this.rooms.get(roomId)
    if (!room) return { ok: false, message: 'Room not found.' }

    if (this.isTurnGuess(room)) {
      return this.startTurnGuessRound(roomId, roundIndex)
    }

    if (this.isSingAlong(room)) {
      return this.startSingAlongRound(roomId, roundIndex)
    }

    if (this.isTimeline(room)) {
      return this.startTimelineRound(roomId, roundIndex)
    }

    return this.startAllInRound(roomId, roundIndex)
  }

  private startAllInRound(roomId: string, roundIndex: number): SimpleResult {
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

    room.status = 'playing'
    room.currentRound = {
      index: roundIndex,
      phase: 'round-intro',
      activePlayerId: null,
      trackId: track.id,
      endsAt: null,
      roundTrack: toMinimalRoundTrack(track),
      submittedPlayerIds: [],
    }

    setTimeout(() => {
      const liveRoom = this.rooms.get(roomId)
      const liveRuntime = this.runtimes.get(roomId)
      if (!liveRoom || !liveRuntime || !liveRoom.currentRound) return
      if (liveRoom.status !== 'playing') return

      this.beginAllInClipPhase(roomId)
    }, ROUND_INTRO_MS)

    return { ok: true, room: this.getPublicRoom(roomId)! }
  }

  private onPostClipAnsweringPhase(roomId: string): void {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime || !room.currentRound) return
    if (room.status !== 'playing') return

    room.currentRound.phase = 'answering'
    room.currentRound.clipEndsAt = null
    syncCurrentRoundPublic(room, runtime)
    this.emitHandlers?.onRoomUpdated(this.getPublicRoom(roomId)!)
  }

  private onAllInClipEnded(roomId: string): void {
    this.onPostClipAnsweringPhase(roomId)
  }

  private onTimelineClipEnded(roomId: string): void {
    this.onPostClipAnsweringPhase(roomId)
  }

  private onTurnGuessClipEnded(roomId: string): void {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime || !room.currentRound) return
    if (room.status !== 'playing') return

    room.currentRound.phase = 'playing'
    room.currentRound.clipEndsAt = null
    syncCurrentRoundPublic(room, runtime)
    this.emitHandlers?.onRoomUpdated(this.getPublicRoom(roomId)!)
  }

  private beginAllInClipPhase(roomId: string): void {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime || !room.currentRound || !runtime.currentTrack) {
      return
    }

    const roundIndex = room.currentRound.index
    const now = Date.now()
    const window = computeCombinedRoundWindowFromSettings(now, room.settings)

    runtime.roundStartedAt = now
    runtime.clipEndsAt = window.clipEndsAt

    room.currentRound.phase = 'clip-playing'
    room.currentRound.clipEndsAt = window.clipEndsAt
    room.currentRound.endsAt = window.endsAt
    syncCurrentRoundPublic(room, runtime)
    this.emitHandlers?.onRoomUpdated(this.getPublicRoom(roomId)!)

    this.emitClipPlaybackForCurrentRound(roomId)

    clearRoundTimer(runtime)
    runtime.roundTimer = setTimeout(() => {
      void this.finishAllInRound(roomId)
    }, window.totalMs)

    setTimeout(() => {
      const liveRoom = this.rooms.get(roomId)
      const liveRuntime = this.runtimes.get(roomId)
      if (!liveRoom || !liveRuntime || !liveRoom.currentRound) return
      if (liveRoom.status !== 'playing') return
      if (liveRoom.currentRound.phase !== 'clip-playing') return

      this.emitHandlers?.onRoundClipEnded(roomId, { roundIndex })
      this.onAllInClipEnded(roomId)
    }, window.clipMs)
  }

  private beginTimelineClipPhase(roomId: string): void {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime || !room.currentRound || !runtime.currentTrack) {
      return
    }

    const roundIndex = room.currentRound.index
    const now = Date.now()
    const window = computeCombinedRoundWindowFromSettings(now, room.settings)

    room.currentRound.phase = 'clip-playing'
    room.currentRound.clipEndsAt = window.clipEndsAt
    room.currentRound.endsAt = window.endsAt
    syncCurrentRoundPublic(room, runtime)
    this.emitHandlers?.onRoomUpdated(this.getPublicRoom(roomId)!)

    this.emitClipPlaybackForCurrentRound(roomId)

    clearRoundTimer(runtime)
    runtime.roundTimer = setTimeout(() => {
      void this.finishTimelineRound(roomId)
    }, window.totalMs)

    setTimeout(() => {
      const liveRoom = this.rooms.get(roomId)
      const liveRuntime = this.runtimes.get(roomId)
      if (!liveRoom || !liveRuntime || !liveRoom.currentRound) return
      if (liveRoom.status !== 'playing') return
      if (liveRoom.currentRound.phase !== 'clip-playing') return

      this.emitHandlers?.onRoundClipEnded(roomId, { roundIndex })
      this.onTimelineClipEnded(roomId)
    }, window.clipMs)
  }

  private beginTurnGuessClipPhase(roomId: string): void {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime || !room.currentRound || !runtime.currentTrack) {
      return
    }

    const roundIndex = room.currentRound.index
    const now = Date.now()
    const window = computeCombinedRoundWindowFromSettings(now, room.settings)

    runtime.roundStartedAt = now
    runtime.clipEndsAt = window.clipEndsAt

    room.currentRound.phase = 'clip-playing'
    room.currentRound.clipEndsAt = window.clipEndsAt
    room.currentRound.endsAt = window.endsAt
    syncCurrentRoundPublic(room, runtime)
    this.emitHandlers?.onRoomUpdated(this.getPublicRoom(roomId)!)

    this.emitClipPlaybackForCurrentRound(roomId)

    clearRoundTimer(runtime)
    runtime.roundTimer = setTimeout(() => {
      this.openTurnGuessVoting(roomId)
    }, window.totalMs)

    setTimeout(() => {
      const liveRoom = this.rooms.get(roomId)
      const liveRuntime = this.runtimes.get(roomId)
      if (!liveRoom || !liveRuntime || !liveRoom.currentRound) return
      if (liveRoom.status !== 'playing') return
      if (liveRoom.currentRound.phase !== 'clip-playing') return

      this.emitHandlers?.onRoundClipEnded(roomId, { roundIndex })
      this.onTurnGuessClipEnded(roomId)
    }, window.clipMs)
  }

  private startTurnGuessRound(roomId: string, roundIndex: number): SimpleResult {
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

    const activePlayer = getActivePlayerForTurn(room, runtime)
    const guessTimerMs = (room.settings.guessTimerSeconds ?? 0) * 1000

    room.status = 'playing'
    room.currentRound = {
      index: roundIndex,
      phase: 'round-intro',
      activePlayerId: activePlayer.id,
      trackId: track.id,
      endsAt: null,
      roundTrack: toMinimalRoundTrack(track),
      submittedPlayerIds: [],
    }

    setTimeout(() => {
      const liveRoom = this.rooms.get(roomId)
      const liveRuntime = this.runtimes.get(roomId)
      if (!liveRoom || !liveRuntime || !liveRoom.currentRound) return
      if (liveRoom.status !== 'playing') return

      this.beginTurnGuessClipPhase(roomId)
    }, ROUND_INTRO_MS)

    return { ok: true, room: this.getPublicRoom(roomId)! }
  }

  private openTurnGuessVoting(roomId: string): void {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime || !room.currentRound) return
    if (room.status !== 'playing') return
    if (room.currentRound.phase !== 'playing' && room.currentRound.phase !== 'clip-playing') return

    clearRoundTimer(runtime)
    runtime.roundVotes.clear()

    room.currentRound.phase = 'voting'
    room.currentRound.endsAt = Date.now() + VOTING_SECONDS * 1000
    syncCurrentRoundPublic(room, runtime)

    this.emitHandlers?.onRoomUpdated(this.getPublicRoom(roomId)!)

    runtime.roundTimer = setTimeout(() => {
      void this.finishTurnGuessRound(roomId)
    }, VOTING_SECONDS * 1000)
  }

  private startSingAlongRound(roomId: string, roundIndex: number): SimpleResult {
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

    const activePlayer = getActivePlayerForTurn(room, runtime)

    room.status = 'playing'
    room.currentRound = {
      index: roundIndex,
      phase: 'round-intro',
      activePlayerId: activePlayer.id,
      trackId: track.id,
      endsAt: null,
      roundTrack: toMinimalRoundTrack(track),
      submittedPlayerIds: [],
    }

    setTimeout(() => {
      const liveRoom = this.rooms.get(roomId)
      const liveRuntime = this.runtimes.get(roomId)
      if (!liveRoom || !liveRuntime || !liveRoom.currentRound) return
      if (liveRoom.status !== 'playing') return

      this.openSingAlongPerforming(roomId)
    }, ROUND_INTRO_MS)

    return { ok: true, room: this.getPublicRoom(roomId)! }
  }

  private openSingAlongPerforming(roomId: string): void {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime || !room.currentRound) return
    if (room.status !== 'playing') return

    clearRoundTimer(runtime)

    const singTimerMs = (room.settings.singTimerSeconds ?? 45) * 1000
    const now = Date.now()
    runtime.roundStartedAt = now
    room.currentRound.phase = 'playing'
    room.currentRound.endsAt = singTimerMs > 0 ? now + singTimerMs : null
    syncCurrentRoundPublic(room, runtime)

    this.emitHandlers?.onRoomUpdated(this.getPublicRoom(roomId)!)
  }

  private openSingAlongRating(roomId: string): void {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime || !room.currentRound) return
    if (room.status !== 'playing') return

    clearRoundTimer(runtime)
    runtime.roundRatings.clear()

    room.currentRound.phase = 'rating'
    room.currentRound.endsAt = Date.now() + RATING_SECONDS * 1000
    syncCurrentRoundPublic(room, runtime)

    this.emitHandlers?.onRoomUpdated(this.getPublicRoom(roomId)!)

    runtime.roundTimer = setTimeout(() => {
      void this.finishSingAlongRound(roomId)
    }, RATING_SECONDS * 1000)
  }

  private finishSingAlongRound(roomId: string): SimpleResult {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime || !room.currentRound) {
      return { ok: false, message: 'No active round.' }
    }

    clearRoundTimer(runtime)

    const activePlayerId = room.currentRound.activePlayerId
    if (activePlayerId) {
      const raterIds = room.players.filter((player) => player.connected).map((player) => player.id)
      fillMissingRatings(raterIds, activePlayerId, runtime.roundRatings)
    }

    room.currentRound.phase = 'reveal'
    room.currentRound.endsAt = null

    const roundResults = scoreSingAlongRoundResults(room, runtime)
    runtime.turnRotationIndex += 1
    room.status = 'round-results'

    const publicRoom = this.getPublicRoom(roomId)!
    this.emitHandlers?.onRoomUpdated(publicRoom)
    if (roundResults) {
      runtime.lastRoundResults = roundResults
      this.emitHandlers?.onRoundResults(roomId, roundResults)
    }

    return { ok: true, room: publicRoom, roundResults: roundResults ?? undefined }
  }

  private startTimelineRound(roomId: string, roundIndex: number): SimpleResult {
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

    const activePlayer = getActivePlayerForTurn(room, runtime)

    room.status = 'playing'
    room.currentRound = {
      index: roundIndex,
      phase: 'round-intro',
      activePlayerId: activePlayer.id,
      trackId: track.id,
      endsAt: null,
      roundTrack: toMinimalRoundTrack(track),
      submittedPlayerIds: [],
    }

    setTimeout(() => {
      const liveRoom = this.rooms.get(roomId)
      const liveRuntime = this.runtimes.get(roomId)
      if (!liveRoom || !liveRuntime || !liveRoom.currentRound) return
      if (liveRoom.status !== 'playing') return

      this.beginTimelineClipPhase(roomId)
    }, ROUND_INTRO_MS)

    return { ok: true, room: this.getPublicRoom(roomId)! }
  }

  private openTimelineAnswering(roomId: string): void {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime || !room.currentRound) return
    if (room.status !== 'playing') return

    clearRoundTimer(runtime)

    const placementTimerMs = (room.settings.guessTimerSeconds ?? 0) * 1000
    room.currentRound.phase = 'answering'
    room.currentRound.endsAt = Date.now() + placementTimerMs
    syncCurrentRoundPublic(room, runtime)

    this.emitHandlers?.onRoomUpdated(this.getPublicRoom(roomId)!)

    runtime.roundTimer = setTimeout(() => {
      void this.finishTimelineRound(roomId)
    }, placementTimerMs)
  }

  private finishTimelineRound(roomId: string): SimpleResult {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime || !room.currentRound) {
      return { ok: false, message: 'No active round.' }
    }

    clearRoundTimer(runtime)

    room.currentRound.phase = 'reveal'
    room.currentRound.endsAt = null

    const roundResults = scoreTimelineRoundResults(room, runtime)
    runtime.turnRotationIndex += 1
    room.status = 'round-results'

    const publicRoom = this.getPublicRoom(roomId)!
    this.emitHandlers?.onRoomUpdated(publicRoom)
    if (roundResults) {
      runtime.lastRoundResults = roundResults
      this.emitHandlers?.onRoundResults(roomId, roundResults)
    }

    return { ok: true, room: publicRoom, roundResults: roundResults ?? undefined }
  }

  private finishAllInRound(roomId: string): SimpleResult {
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

  private finishTurnGuessRound(roomId: string): SimpleResult {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime || !room.currentRound) {
      return { ok: false, message: 'No active round.' }
    }

    clearRoundTimer(runtime)

    const activePlayerId = room.currentRound.activePlayerId
    if (activePlayerId) {
      const voterIds = room.players.filter((player) => player.connected).map((player) => player.id)
      fillMissingVotes(voterIds, activePlayerId, room.settings.guessFields, runtime.roundVotes)
    }

    room.currentRound.phase = 'reveal'
    room.currentRound.endsAt = null

    const roundResults = scoreTurnGuessRoundResults(room, runtime)
    runtime.turnRotationIndex += 1
    room.status = 'round-results'

    const publicRoom = this.getPublicRoom(roomId)!
    this.emitHandlers?.onRoomUpdated(publicRoom)
    if (roundResults) {
      runtime.lastRoundResults = roundResults
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

  private handlePlayerUnavailableMidRound(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime || room.status !== 'playing' || !room.currentRound) return

    const activePlayerId = room.currentRound.activePlayerId
    if (!activePlayerId || activePlayerId !== playerId) return

    const phase = room.currentRound.phase

    if (this.isTurnGuess(room)) {
      if (phase === 'clip-playing' || phase === 'playing' || phase === 'round-intro') {
        this.openTurnGuessVoting(roomId)
      }
      return
    }

    if (this.isSingAlong(room)) {
      if (phase === 'playing' || phase === 'round-intro') {
        this.openSingAlongRating(roomId)
      }
      return
    }

    if (this.isTimeline(room)) {
      if (phase === 'clip-playing') {
        this.openTimelineAnswering(roomId)
      } else if (phase === 'playing' || phase === 'answering' || phase === 'round-intro') {
        void this.finishTimelineRound(roomId)
      }
    }
  }

  retrySpotifyPlayback(roomId: string, hostPlayerId: string): SimpleResult {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime || !room.currentRound) {
      return { ok: false, message: 'No active round.' }
    }

    if (room.hostPlayerId !== hostPlayerId) {
      return { ok: false, message: 'Only the host can retry playback.' }
    }

    const phase = room.currentRound.phase
    if (phase === 'clip-playing') {
      this.emitClipPlaybackForCurrentRound(roomId)
      return { ok: true, room: this.getPublicRoom(roomId)! }
    }

    return { ok: false, message: 'Playback can only be retried during the song clip.' }
  }

  private beginClipPhase(roomId: string, onClipEnded: () => void): void {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime || !room.currentRound || !runtime.currentTrack) {
      onClipEnded()
      return
    }

    const durationMs = clipDurationMs(room.settings)
    const roundIndex = room.currentRound.index

    room.currentRound.phase = 'clip-playing'
    room.currentRound.endsAt = Date.now() + durationMs
    syncCurrentRoundPublic(room, runtime)
    this.emitHandlers?.onRoomUpdated(this.getPublicRoom(roomId)!)

    this.emitClipPlaybackForCurrentRound(roomId)

    clearRoundTimer(runtime)
    runtime.roundTimer = setTimeout(() => {
      this.emitHandlers?.onRoundClipEnded(roomId, { roundIndex })
      onClipEnded()
    }, durationMs)
  }

  resyncHostPlayback(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId)
    if (!room || room.hostPlayerId !== playerId) return
    const phase = room.currentRound?.phase
    if (phase === 'clip-playing') {
      this.emitClipPlaybackForCurrentRound(roomId)
    }
  }

  private emitClipPlaybackForCurrentRound(roomId: string): void {
    const room = this.rooms.get(roomId)
    const runtime = this.runtimes.get(roomId)
    if (!room || !runtime?.currentTrack || !room.currentRound) return

    const track = runtime.currentTrack
    const roundIndex = room.currentRound.index

    if (room.settings.playbackMode === 'spotify-full') {
      if (!track.spotifyUri) return
      this.emitHandlers?.onSpotifyPlayTrack(
        roomId,
        room.hostPlayerId,
        buildSpotifyPlayPayload(track, roundIndex, room.settings),
      )
      return
    }

    if (!track.spotifyUrl) return
    this.emitHandlers?.onHostPlayClip(
      roomId,
      room.hostPlayerId,
      buildHostClipPlayPayload(track, roundIndex, room.settings),
    )
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
