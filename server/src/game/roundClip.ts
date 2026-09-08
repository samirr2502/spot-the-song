import type { GameRoom, GameSettings } from '@spot-the-song/shared'
import type { SpotifyPlayTrackPayload } from '@spot-the-song/shared'
import type { HostClipPlayPayload } from '@spot-the-song/shared'
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

/** Full-track playback for sing-along — host stops manually when advancing to rating. */
export function buildSingAlongSpotifyPayload(
  track: Track,
  roundIndex: number,
): SpotifyPlayTrackPayload {
  return {
    spotifyUri: track.spotifyUri,
    startMs: 0,
    durationMs: 10 * 60 * 1000,
    roundIndex,
  }
}

export function buildHostClipPlayPayload(
  track: Track,
  roundIndex: number,
  settings: GameSettings,
): HostClipPlayPayload {
  return {
    roundIndex,
    durationMs: settings.clipDurationSeconds * 1000,
    previewUrl: track.previewUrl,
    spotifyUrl: track.spotifyUrl,
  }
}

export function clipDurationMs(settings: GameSettings): number {
  return settings.clipDurationSeconds * 1000
}
