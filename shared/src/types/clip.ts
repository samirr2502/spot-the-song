export type ClipMode = 'start' | 'random'

export type ClipSettings = {
  mode: ClipMode
  durationMs: number
}

export const CLIP_DURATION_OPTIONS_MS = [15_000, 30_000] as const

export const DEFAULT_CLIP_SETTINGS: ClipSettings = {
  mode: 'start',
  durationMs: 30_000,
}

export function clipSettingsFromSeconds(seconds: number): ClipSettings {
  return {
    mode: 'start',
    durationMs: seconds * 1000,
  }
}
