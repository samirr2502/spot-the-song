import type {
  GameRoom,
  RoundResultsPayload,
  TimelineBonusPayload,
  TimelineCardPublic,
  TimelineCardStored,
  Track,
} from '@spot-the-song/shared'
import {
  isTimelinePlacementCorrect,
  scoreTimelineRound,
  timelineYearsFromTrackIds,
} from '@spot-the-song/shared'
import type { RoomRuntime } from './roomRuntime.js'
import { buildLeaderboard } from './allInGame.js'
import { getActivePlayerForTurn } from './turnGuessGame.js'
import { pickRandomTrack } from './roomRuntime.js'

export { getActivePlayerForTurn }

export function initializePlayerTimelines(room: GameRoom, runtime: RoomRuntime): string | null {
  runtime.playerTimelines.clear()

  for (const player of room.players) {
    const track = pickRandomTrack(runtime)
    if (!track) {
      return 'Not enough tracks for starter cards — lower the round count or add more music.'
    }

    runtime.playerTimelines.set(player.id, [
      { trackId: track.id, isStarter: true, revealed: true },
    ])
  }

  return null
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
    year: track.year,
    artworkUrl: track.artworkUrl,
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
): RoundResultsPayload | null {
  const track = runtime.currentTrack
  const activePlayerId = room.currentRound?.activePlayerId
  if (!track || !activePlayerId || !room.currentRound) return null

  const timeline = runtime.playerTimelines.get(activePlayerId) ?? []
  const years = timelineYearsFromTrackIds(
    timeline.map((card) => card.trackId),
    (trackId) => getTrackById(runtime, trackId)?.year,
  )

  const insertIndex = runtime.timelinePlacementIndex
  const placementCorrect =
    insertIndex !== null && isTimelinePlacementCorrect(track.year, years, insertIndex)

  if (placementCorrect && insertIndex !== null) {
    const nextTimeline = [...timeline]
    nextTimeline.splice(insertIndex, 0, {
      trackId: track.id,
      isStarter: false,
      revealed: true,
    })
    runtime.playerTimelines.set(activePlayerId, nextTimeline)
  }

  const result = scoreTimelineRound(
    activePlayerId,
    track,
    placementCorrect,
    runtime.timelineBonusAnswers,
    room.settings.guessFields,
  )

  room.scores[activePlayerId] = (room.scores[activePlayerId] ?? 0) + result.totalRoundPoints

  return {
    roundIndex: room.currentRound.index,
    mode: 'timeline',
    activePlayerId,
    placementCorrect,
    insertIndex: insertIndex ?? undefined,
    track: { ...track },
    playerResults: [result],
    leaderboard: buildLeaderboard(room),
  }
}
