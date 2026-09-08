import type { GameRoom, GameSettings } from '@spot-the-song/shared'
import type { SpotifyPlayTrackPayload } from '@spot-the-song/shared'
import type { Track } from '@spot-the-song/shared'

export function usesClipPhase(room: GameRoom): boolean {
  if (room.settings.playMode === 'all-in') return true
  if (room.settings.playMode === 'turns') {
    const turnGame = room.settings.turnGame
    return turnGame === 'guess' || turnGame === 'timeline'
  }
  return false
}

export function buildSpotifyPlayPayload(
  track: Track,
  roundIndex: number,
  settings: GameSettings,
): SpotifyPlayTrackPayload {
  return {
    spotifyUri: track.spotifyUri,
    startMs: 0,
    durationMs: settings.clipDurationSeconds * 1000,
    roundIndex,
  }
}

export function clipDurationMs(settings: GameSettings): number {
  return settings.clipDurationSeconds * 1000
}
