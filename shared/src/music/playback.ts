export type PlayTrackParams = {
  uri: string
  startMs: number
  durationMs: number
}

export type PlaybackState =
  | 'idle'
  | 'initializing'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'error'

export interface PlaybackProvider {
  initialize(): Promise<void>
  playTrack(params: PlayTrackParams): Promise<void>
  pause(): Promise<void>
  getState(): PlaybackState
  dispose(): void
}
