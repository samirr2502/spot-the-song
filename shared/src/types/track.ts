export type Track = {
  id: string
  title: string
  artist: string
  album: string
  year: number | null
  artworkUrl: string | null
  spotifyUri: string
  spotifyUrl: string
  durationMs: number
  /** @deprecated Unreliable 30s preview — do not use for gameplay. Optional fallback only. */
  previewUrl?: string
}
