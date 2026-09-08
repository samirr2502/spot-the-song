import type { GameRoom, RoundResultsPayload, SubmitAnswersPayload } from '@spot-the-song/shared'
import { scorePlayerRound } from '@spot-the-song/shared'
import type { RoomRuntime, StoredAnswer } from './roomRuntime.js'
import { toChallengeTrack, toMinimalRoundTrack, toPublicTrack, toRevealTrack } from './roomRuntime.js'

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

    const speedEndsAt = runtime.clipEndsAt ?? endsAt

    const result = scorePlayerRound(
      player.id,
      answers,
      track,
      room.settings.guessFields,
      submittedAt,
      runtime.roundStartedAt!,
      speedEndsAt,
    )

    room.scores[player.id] = (room.scores[player.id] ?? 0) + result.totalRoundPoints
    return result
  })

  const payload: RoundResultsPayload = {
    roundIndex: room.currentRound.index,
    mode: 'all-in',
    track: toRevealTrack(track),
    playerResults,
    leaderboard: buildLeaderboard(room),
  }

  runtime.lastRoundResults = payload
  return payload
}

export function resetRoundRuntime(runtime: RoomRuntime): void {
  runtime.roundAnswers = new Map()
  runtime.roundVotes = new Map()
  runtime.roundRatings = new Map()
  runtime.timelinePlacementIndex = null
  runtime.timelineBonusAnswers = null
  runtime.timelinePlacementLocked = false
  runtime.roundStartedAt = null
  runtime.clipEndsAt = null
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

  if (room.currentRound.phase === 'voting') {
    room.currentRound.submittedPlayerIds = Array.from(runtime.roundVotes.keys())
  } else if (room.currentRound.phase === 'rating') {
    room.currentRound.submittedPlayerIds = Array.from(runtime.roundRatings.keys())
  } else if (
    room.currentRound.phase === 'answering' ||
    (room.settings.playMode === 'all-in' && room.currentRound.phase === 'clip-playing')
  ) {
    room.currentRound.submittedPlayerIds = getSubmittedPlayerIds(runtime)
  } else {
    room.currentRound.submittedPlayerIds = []
  }

  room.currentRound.roundTrack = runtime.currentTrack
    ? room.currentRound.phase === 'reveal' || room.status === 'round-results'
      ? toPublicTrack(runtime.currentTrack)
      : toMinimalRoundTrack(runtime.currentTrack)
    : null
  room.currentRound.trackId = runtime.currentTrack?.id ?? null

  const isTurnGuess = room.settings.playMode === 'turns' && room.settings.turnGame === 'guess'
  const isSingAlong = room.settings.playMode === 'turns' && room.settings.turnGame === 'sing'
  const phase = room.currentRound.phase

  if (runtime.currentTrack) {
    if (isTurnGuess && phase === 'voting') {
      room.currentRound.challengeTrack = toChallengeTrack(runtime.currentTrack)
    } else if (isSingAlong && phase === 'rating') {
      room.currentRound.challengeTrack = toChallengeTrack(runtime.currentTrack)
    } else {
      room.currentRound.challengeTrack = null
    }

    room.currentRound.performerSpotifyUrl =
      isSingAlong && phase === 'playing'
        ? runtime.currentTrack.spotifyUrl ?? undefined
        : undefined
  } else {
    room.currentRound.challengeTrack = null
    room.currentRound.performerSpotifyUrl = undefined
  }
}

export function toPublicRoom(room: GameRoom, runtime: RoomRuntime | undefined): GameRoom {
  const copy: GameRoom = {
    ...room,
    players: room.players.map((player) => ({ ...player })),
    scores: { ...room.scores },
    trackPool: [],
    trackPoolSize: runtime?.trackPool.length ?? room.trackPool.length,
    playlistName: runtime?.playlistName,
    playableTrackCount: runtime?.trackPool.filter((track) => track.spotifyUri).length,
    musicSource: runtime?.musicSource,
    currentRound: room.currentRound ? { ...room.currentRound } : null,
    readyPlayerIds: runtime ? Array.from(runtime.howToPlayAcks) : room.readyPlayerIds,
  }

  if (copy.currentRound && runtime) {
    syncCurrentRoundPublic(copy, runtime)
  }

  return copy
}
