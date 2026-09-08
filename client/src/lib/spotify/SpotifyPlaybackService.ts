import type { PlaybackProvider, PlaybackState, PlayTrackParams } from '@spot-the-song/shared'
import { fetchSpotifyAccessToken } from './authApi.js'

declare global {
  interface Window {
    Spotify?: {
      Player: new (options: SpotifyPlayerOptions) => SpotifyPlayer
    }
  }
}

type SpotifyPlayerOptions = {
  name: string
  getOAuthToken: (callback: (token: string) => void) => void
  volume: number
}

type SpotifyPlayer = {
  connect: () => Promise<boolean>
  disconnect: () => void
  addListener: (event: string, callback: (...args: unknown[]) => void) => void
  removeListener: (event: string, callback?: (...args: unknown[]) => void) => void
  getCurrentState: () => Promise<unknown>
}

function loadSpotifySdk(): Promise<void> {
  if (window.Spotify) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-spotify-sdk]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Spotify SDK')))
      return
    }

    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true
    script.dataset.spotifySdk = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Spotify Web Playback SDK'))
    document.body.appendChild(script)
  })
}

export class SpotifyPlaybackService implements PlaybackProvider {
  private player: SpotifyPlayer | null = null
  private deviceId: string | null = null
  private state: PlaybackState = 'idle'
  private clipTimer: number | null = null
  private onStateChange: ((state: PlaybackState, message?: string) => void) | null = null

  setStateListener(listener: (state: PlaybackState, message?: string) => void) {
    this.onStateChange = listener
  }

  getState(): PlaybackState {
    return this.state
  }

  private setState(next: PlaybackState, message?: string) {
    this.state = next
    this.onStateChange?.(next, message)
  }

  async initialize(): Promise<void> {
    if (this.player && this.deviceId) return

    this.setState('initializing')
    await loadSpotifySdk()

    if (!window.Spotify) {
      this.setState('error', 'Spotify SDK unavailable in this browser.')
      throw new Error('Spotify SDK unavailable in this browser.')
    }

    this.player = new window.Spotify.Player({
      name: 'Spot the Song Host Player',
      volume: 1,
      getOAuthToken: (callback) => {
        void fetchSpotifyAccessToken()
          .then((result) => callback(result.accessToken))
          .catch((error) => {
            this.setState('error', error instanceof Error ? error.message : 'Auth failed')
            callback('')
          })
      },
    })

    this.player.addListener('ready', (...args: unknown[]) => {
      const { device_id } = args[0] as { device_id: string }
      this.deviceId = device_id
      this.setState('ready')
    })

    this.player.addListener('not_ready', () => {
      this.setState('error', 'Spotify player not ready.')
    })

    this.player.addListener('initialization_error', (...args: unknown[]) => {
      const { message } = args[0] as { message: string }
      this.setState('error', message)
    })

    this.player.addListener('authentication_error', (...args: unknown[]) => {
      const { message } = args[0] as { message: string }
      this.setState('error', message)
    })

    this.player.addListener('account_error', (...args: unknown[]) => {
      const { message } = args[0] as { message: string }
      this.setState('error', `${message} Premium may be required.`)
    })

    this.player.addListener('playback_error', (...args: unknown[]) => {
      const { message } = args[0] as { message: string }
      this.setState('error', message)
    })

    const connected = await this.player.connect()
    if (!connected) {
      this.setState('error', 'Could not connect Spotify player.')
      throw new Error('Could not connect Spotify player.')
    }
  }

  async playTrack(params: PlayTrackParams): Promise<void> {
    this.clearClipTimer()

    if (!this.deviceId) {
      await this.initialize()
    }

    if (!this.deviceId) {
      throw new Error('Spotify player device is not ready.')
    }

    const token = await fetchSpotifyAccessToken()
    const response = await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(this.deviceId)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: [params.uri],
          position_ms: params.startMs,
        }),
      },
    )

    if (!response.ok) {
      const text = await response.text()
      this.setState('error', 'Playback failed.')
      throw new Error(text || 'Spotify playback failed.')
    }

    this.setState('playing')
    this.clipTimer = window.setTimeout(() => {
      void this.pause()
    }, params.durationMs)
  }

  async pause(): Promise<void> {
    this.clearClipTimer()

    if (!this.deviceId) {
      this.setState('paused')
      return
    }

    const token = await fetchSpotifyAccessToken()
    await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${encodeURIComponent(this.deviceId)}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
      },
    })

    this.setState('paused')
  }

  dispose(): void {
    this.clearClipTimer()
    this.player?.disconnect()
    this.player = null
    this.deviceId = null
    this.setState('idle')
  }

  private clearClipTimer() {
    if (this.clipTimer !== null) {
      window.clearTimeout(this.clipTimer)
      this.clipTimer = null
    }
  }
}
