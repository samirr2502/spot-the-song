/** Host-only preview clip command (server → host socket). */
export type HostClipPlayPayload = {
  roundIndex: number
  durationMs: number
  previewUrl?: string
  spotifyUrl: string
}

/** Host-only playback command (server → host socket). */
export type SpotifyPlayTrackPayload = {
  spotifyUri: string
  startMs: number
  durationMs: number
  roundIndex: number
}

/** Host playback lifecycle (host → server). */
export type SpotifyPlayerReadyPayload = {
  deviceId: string
}

export type SpotifyPlaybackStartedPayload = {
  roundIndex: number
  spotifyUri: string
}

export type SpotifyPlaybackErrorPayload = {
  roundIndex?: number
  message: string
  code?: string
}

/** Room-visible round lifecycle — no answer metadata before reveal. */
export type RoundStartedPayload = {
  roundIndex: number
  phase: string
  endsAt: number | null
  clipDurationMs: number
}

export type RoundClipEndedPayload = {
  roundIndex: number
}

export type RoundAnsweringPayload = {
  roundIndex: number
  endsAt: number | null
}

export type RoundRevealPayload = {
  roundIndex: number
  track: {
    id: string
    title: string
    artist: string
    album: string
    year: number | null
    artworkUrl: string | null
    spotifyUrl: string
  }
}
