import type {
  GameRoom,
  RoundResultsPayload,
  TimelineBonusPayload,
  TimelineCardPublic,
  TimelineCardStored,
  Track,
} from '@spot-the-song/shared'
import {
  DEFAULT_TIMELINE_CARDS_TO_WIN,
  getTimelineCardCounts,
  resolveTimelineTurn,
  timelineYearsFromTrackIds,
  TIMELINE_STARTING_COINS,
} from '@spot-the-song/shared'
import type { RoomRuntime } from './roomRuntime.js'
import { buildLeaderboard } from './allInGame.js'
import { getActivePlayerForTurn } from './turnGuessGame.js'
import { pickRandomTrack, toRevealTrack } from './roomRuntime.js'

export { getActivePlayerForTurn }

export function getTimelineCardsToWin(room: GameRoom): number {
  return room.settings.cardsToWin ?? room.settings.roundCount ?? DEFAULT_TIMELINE_CARDS_TO_WIN
}

export function initializePlayerTimelines(room: GameRoom, runtime: RoomRuntime): string | null {
  runtime.playerTimelines.clear()

  for (const player of room.players) {
    const track = pickRandomTrack(runtime)
    if (!track) {
      return 'Not enough tracks for starter cards — add more music or lower cards to win.'
    }

    runtime.playerTimelines.set(player.id, [
      { trackId: track.id, isStarter: true, revealed: true },
    ])
  }

  return null
}

export function initializePlayerCoins(room: GameRoom, runtime: RoomRuntime): void {
  runtime.playerCoins.clear()
  for (const player of room.players) {
    runtime.playerCoins.set(player.id, TIMELINE_STARTING_COINS)
  }
}

export function getPublicCoins(runtime: RoomRuntime): Record<string, number> {
  const coins: Record<string, number> = {}
  for (const [playerId, balance] of runtime.playerCoins.entries()) {
    coins[playerId] = balance
  }
  return coins
}

export function applyCoinChanges(runtime: RoomRuntime, changes: Array<{ playerId: string; delta: number }>): void {
  for (const change of changes) {
    const current = runtime.playerCoins.get(change.playerId) ?? 0
    runtime.playerCoins.set(change.playerId, Math.max(0, current + change.delta))
  }
}

export function getTrackById(runtime: RoomRuntime, trackId: string): Track | undefined {
  return runtime.trackPool.find((track) => track.id === trackId)
}

export function toPublicTimelineCard(
  card: TimelineCardStored,
  runtime: RoomRuntime,
): TimelineCardPublic {
  const track = getTrackById(runtime, card.trackId)

  if (!track || (!card.revealed && !card.isStarter)) {
    return {
      trackId: card.trackId,
      isStarter: card.isStarter,
      revealed: false,
    }
  }

  return {
    trackId: card.trackId,
    title: track.title,
    artist: track.artist,
    album: track.album,
    year: track.year ?? undefined,
    artworkUrl: track.artworkUrl ?? undefined,
    previewUrl: track.previewUrl,
    isStarter: card.isStarter,
    revealed: true,
  }
}

export function toPublicTimelines(
  room: GameRoom,
  runtime: RoomRuntime,
): Record<string, TimelineCardPublic[]> {
  const timelines: Record<string, TimelineCardPublic[]> = {}

  for (const player of room.players) {
    const cards = runtime.playerTimelines.get(player.id) ?? []
    timelines[player.id] = cards.map((card) => toPublicTimelineCard(card, runtime))
  }

  return timelines
}

export function storeTimelinePlacement(runtime: RoomRuntime, insertIndex: number): void {
  runtime.timelinePlacementIndex = insertIndex
  runtime.timelinePlacementLocked = true
}

export function storeTimelineBonus(runtime: RoomRuntime, bonus: TimelineBonusPayload): void {
  runtime.timelineBonusAnswers = bonus
}

export function resetTimelineTurnRuntime(runtime: RoomRuntime): void {
  runtime.timelinePlacementIndex = null
  runtime.timelineBonusAnswers = null
  runtime.timelinePlacementLocked = false
}

export function validateInsertIndex(
  room: GameRoom,
  runtime: RoomRuntime,
  activePlayerId: string,
  insertIndex: number,
): string | null {
  if (!Number.isInteger(insertIndex) || insertIndex < 0) {
    return 'Pick a valid timeline slot.'
  }

  const timeline = runtime.playerTimelines.get(activePlayerId) ?? []
  if (insertIndex > timeline.length) {
    return 'Pick a valid timeline slot.'
  }

  return null
}

export function bonusFieldsEnabled(room: GameRoom): boolean {
  return room.settings.guessFields.title || room.settings.guessFields.artist
}

export function canFinishTimelineTurn(room: GameRoom, runtime: RoomRuntime): boolean {
  if (!runtime.timelinePlacementLocked || runtime.timelinePlacementIndex === null) {
    return false
  }

  if (!bonusFieldsEnabled(room)) {
    return true
  }

  return runtime.timelineBonusAnswers !== null
}

export function scoreTimelineRoundResults(
  room: GameRoom,
  runtime: RoomRuntime,
  challengerPlayerId: string | null,
): RoundResultsPayload | null {
  const track = runtime.currentTrack
  const activePlayerId = room.currentRound?.activePlayerId
  if (!track || !activePlayerId || !room.currentRound) return null

  const activeTimeline = runtime.playerTimelines.get(activePlayerId) ?? []
  const activeTimelineYears = timelineYearsFromTrackIds(
    activeTimeline.map((card) => card.trackId),
    (trackId) => getTrackById(runtime, trackId)?.year,
  )

  const challengerTimelineYears =
    challengerPlayerId !== null
      ? timelineYearsFromTrackIds(
          (runtime.playerTimelines.get(challengerPlayerId) ?? []).map((card) => card.trackId),
          (trackId) => getTrackById(runtime, trackId)?.year,
        )
      : null

  const insertIndex = runtime.timelinePlacementIndex
  const resolution = resolveTimelineTurn(
    activePlayerId,
    challengerPlayerId,
    track,
    activeTimelineYears,
    challengerTimelineYears,
    insertIndex,
    runtime.timelineBonusAnswers,
    room.settings.guessFields,
  )

  applyCoinChanges(
    runtime,
    resolution.coinChanges.filter((change) => change.reason !== 'challenge-cost'),
  )

  if (resolution.cardAwardedTo !== null && resolution.cardInsertIndex !== null) {
    const recipientTimeline = [...(runtime.playerTimelines.get(resolution.cardAwardedTo) ?? [])]
    recipientTimeline.splice(resolution.cardInsertIndex, 0, {
      trackId: track.id,
      isStarter: false,
      revealed: true,
    })
    runtime.playerTimelines.set(resolution.cardAwardedTo, recipientTimeline)
  }

  room.scores[activePlayerId] =
    (room.scores[activePlayerId] ?? 0) + resolution.playerResult.totalRoundPoints

  const connectedPlayerIds = room.players
    .filter((player) => player.connected)
    .map((player) => player.id)

  return {
    roundIndex: room.currentRound.index,
    mode: 'timeline',
    activePlayerId,
    placementCorrect: resolution.placementCorrect,
    insertIndex: insertIndex ?? undefined,
    challengerPlayerId: challengerPlayerId ?? undefined,
    cardAwardedTo: resolution.cardAwardedTo ?? undefined,
    coinChanges: resolution.coinChanges.filter((change) => change.reason !== 'challenge-cost'),
    cardCounts: getTimelineCardCounts(connectedPlayerIds, runtime.playerTimelines),
    track: toRevealTrack(track),
    playerResults: [resolution.playerResult],
    leaderboard: buildLeaderboard(room),
  }
}
