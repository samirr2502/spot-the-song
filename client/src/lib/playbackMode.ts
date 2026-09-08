import type { PlaybackMode } from '@spot-the-song/shared'

const STORAGE_KEY = 'sts:full-playback'

export function isFullPlaybackEnabled(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function setFullPlaybackEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      sessionStorage.setItem(STORAGE_KEY, '1')
    } else {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // ignore
  }
}

export function resolvePlaybackModeForCreate(): PlaybackMode {
  return isFullPlaybackEnabled() ? 'spotify-full' : 'preview'
}
