import type { RoundResultsPayload, SubmitAnswersPayload } from '@spot-the-song/shared'
import type { Track } from '@spot-the-song/shared'
import type { VotePayload } from '@spot-the-song/shared'

export type StoredAnswer = {
  answers: SubmitAnswersPayload
  submittedAt: number
}

export type RoomRuntime = {
  trackPool: Track[]
  usedTrackIds: string[]
  currentTrack: Track | null
  roundAnswers: Map<string, StoredAnswer>
  roundVotes: Map<string, VotePayload>
  roundRatings: Map<string, number>
  turnRotationIndex: number
  roundStartedAt: number | null
  howToPlayAcks: Set<string>
  roundTimer: ReturnType<typeof setTimeout> | null
  lastRoundResults: RoundResultsPayload | null
  playlistName?: string
  musicSource?: 'spotify' | 'mock'
}

export function createRoomRuntime(trackPool: Track[]): RoomRuntime {
  return {
    trackPool,
    usedTrackIds: [],
    currentTrack: null,
    roundAnswers: new Map(),
    roundVotes: new Map(),
    roundRatings: new Map(),
    turnRotationIndex: 0,
    roundStartedAt: null,
    howToPlayAcks: new Set(),
    roundTimer: null,
    lastRoundResults: null,
  }
}

export function clearRoundTimer(runtime: RoomRuntime): void {
  if (runtime.roundTimer) {
    clearTimeout(runtime.roundTimer)
    runtime.roundTimer = null
  }
}

export function pickRandomTrack(runtime: RoomRuntime): Track | null {
  const available = runtime.trackPool.filter((track) => !runtime.usedTrackIds.includes(track.id))
  if (available.length === 0) return null

  const track = available[Math.floor(Math.random() * available.length)]!
  runtime.usedTrackIds.push(track.id)
  runtime.currentTrack = track
  return track
}

export function toPublicTrack(track: Track) {
  return {
    id: track.id,
    previewUrl: track.previewUrl,
    artworkUrl: track.artworkUrl,
  }
}
