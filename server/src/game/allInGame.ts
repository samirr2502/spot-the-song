import type { GameRoom, RoundResultsPayload, SubmitAnswersPayload } from '@spot-the-song/shared'
import { scorePlayerRound } from '@spot-the-song/shared'
import type { RoomRuntime, StoredAnswer } from './roomRuntime.js'
import { toPublicTrack } from './roomRuntime.js'

export function buildLeaderboard(room: GameRoom) {
  return room.players
    .map((player) => ({
      playerId: player.id,
      name: player.name,
      score: room.scores[player.id] ?? 0,
    }))
    .sort((a, b) => b.score - a.score)
}

export function scoreRound(
  room: GameRoom,
  runtime: RoomRuntime,
  endsAt: number,
): RoundResultsPayload | null {
  const track = runtime.currentTrack
  if (!track || runtime.roundStartedAt === null || !room.currentRound) {
    return null
  }

  const connectedPlayers = room.players.filter((player) => player.connected)
  const playerResults = connectedPlayers.map((player) => {
    const stored = runtime.roundAnswers.get(player.id)
    const answers = stored?.answers ?? {}
    const submittedAt = stored?.submittedAt ?? endsAt

    const result = scorePlayerRound(
      player.id,
      answers,
      track,
      room.settings.guessFields,
      submittedAt,
      runtime.roundStartedAt!,
      endsAt,
    )

    room.scores[player.id] = (room.scores[player.id] ?? 0) + result.totalRoundPoints
    return result
  })

  const payload: RoundResultsPayload = {
    roundIndex: room.currentRound.index,
    track: { ...track },
    playerResults,
    leaderboard: buildLeaderboard(room),
  }

  runtime.lastRoundResults = payload
  return payload
}

export function resetRoundRuntime(runtime: RoomRuntime): void {
  runtime.roundAnswers = new Map()
  runtime.roundStartedAt = null
  runtime.currentTrack = null
}

export function getSubmittedPlayerIds(runtime: RoomRuntime): string[] {
  return Array.from(runtime.roundAnswers.keys())
}

export function storeAnswer(
  runtime: RoomRuntime,
  playerId: string,
  answers: SubmitAnswersPayload,
  submittedAt: number,
): void {
  runtime.roundAnswers.set(playerId, { answers, submittedAt })
}

export function allConnectedSubmitted(room: GameRoom, runtime: RoomRuntime): boolean {
  const connected = room.players.filter((player) => player.connected)
  return connected.every((player) => runtime.roundAnswers.has(player.id))
}

export function syncCurrentRoundPublic(room: GameRoom, runtime: RoomRuntime): void {
  if (!room.currentRound) return

  room.currentRound.submittedPlayerIds = getSubmittedPlayerIds(runtime)
  room.currentRound.roundTrack = runtime.currentTrack ? toPublicTrack(runtime.currentTrack) : null
  room.currentRound.trackId = runtime.currentTrack?.id ?? null
}

export function toPublicRoom(room: GameRoom, runtime: RoomRuntime | undefined): GameRoom {
  const copy: GameRoom = {
    ...room,
    players: room.players.map((player) => ({ ...player })),
    scores: { ...room.scores },
    trackPool: [],
    trackPoolSize: runtime?.trackPool.length ?? room.trackPool.length,
    currentRound: room.currentRound ? { ...room.currentRound } : null,
    readyPlayerIds: runtime ? Array.from(runtime.howToPlayAcks) : room.readyPlayerIds,
  }

  if (copy.currentRound && runtime) {
    syncCurrentRoundPublic(copy, runtime)
  }

  return copy
}
