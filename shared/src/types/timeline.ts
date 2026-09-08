export type TimelineCardStored = {
  trackId: string
  isStarter: boolean
  revealed: boolean
}

export type TimelineCardPublic = {
  trackId: string
  title?: string
  artist?: string
  album?: string
  year?: number
  artworkUrl?: string
  previewUrl?: string
  isStarter: boolean
  revealed: boolean
}

export type PlaceCardPayload = {
  insertIndex: number
}

export type TimelineBonusPayload = {
  title?: string
  artist?: string
}
