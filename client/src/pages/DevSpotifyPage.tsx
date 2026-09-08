import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SketchButton, SketchCard, SketchDivider, SketchInput, SketchRadio } from '../components/sketch'
import {
  disconnectSpotify,
  fetchSpotifyStatus,
  parseTrackUri,
  startSpotifyLogin,
  type SpotifyAuthStatus,
} from '../lib/spotify/authApi'
import { SpotifyPlaybackService } from '../lib/spotify/SpotifyPlaybackService'
import type { PlaybackState } from '@spot-the-song/shared'

const CLIP_OPTIONS = [
  { label: '15 seconds', value: 15_000 },
  { label: '30 seconds', value: 30_000 },
] as const

export function DevSpotifyPage() {
  const [searchParams] = useSearchParams()
  const playbackRef = useRef<SpotifyPlaybackService | null>(null)

  const [authStatus, setAuthStatus] = useState<SpotifyAuthStatus>({ connected: false })
  const [trackInput, setTrackInput] = useState('')
  const [clipDurationMs, setClipDurationMs] = useState<number>(30_000)
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle')
  const [playbackMessage, setPlaybackMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [playStartedAt, setPlayStartedAt] = useState<number | null>(null)

  const parsedUri = useMemo(() => parseTrackUri(trackInput), [trackInput])
  const callbackError = searchParams.get('error')

  useEffect(() => {
    void refreshAuth()
  }, [])

  useEffect(() => {
    const service = new SpotifyPlaybackService()
    service.setStateListener((state, message) => {
      setPlaybackState(state)
      if (message) setPlaybackMessage(message)
    })
    playbackRef.current = service

    return () => {
      service.dispose()
      playbackRef.current = null
    }
  }, [])

  useEffect(() => {
    if (playbackState !== 'playing' || playStartedAt === null) {
      setElapsedMs(0)
      return
    }

    const interval = window.setInterval(() => {
      setElapsedMs(Math.min(clipDurationMs, Date.now() - playStartedAt))
    }, 200)

    return () => window.clearInterval(interval)
  }, [playbackState, playStartedAt, clipDurationMs])

  async function refreshAuth() {
    const status = await fetchSpotifyStatus()
    setAuthStatus(status)
  }

  async function handleConnect() {
    startSpotifyLogin()
  }

  async function handleDisconnect() {
    await disconnectSpotify()
    playbackRef.current?.dispose()
    setPlaybackState('idle')
    await refreshAuth()
  }

  async function handleInitializePlayer() {
    setBusy(true)
    setPlaybackMessage(null)
    try {
      await playbackRef.current?.initialize()
    } catch (error) {
      setPlaybackMessage(error instanceof Error ? error.message : 'Player init failed')
    } finally {
      setBusy(false)
    }
  }

  async function handlePlayClip() {
    if (!parsedUri) {
      setPlaybackMessage('Paste a valid Spotify track link or URI.')
      return
    }

    setBusy(true)
    setPlaybackMessage(null)

    try {
      await playbackRef.current?.playTrack({
        uri: parsedUri,
        startMs: 0,
        durationMs: clipDurationMs,
      })
      setPlayStartedAt(Date.now())
    } catch (error) {
      setPlaybackMessage(error instanceof Error ? error.message : 'Playback failed')
    } finally {
      setBusy(false)
    }
  }

  async function handlePause() {
    setBusy(true)
    try {
      await playbackRef.current?.pause()
      setPlayStartedAt(null)
    } finally {
      setBusy(false)
    }
  }

  const progress = clipDurationMs > 0 ? elapsedMs / clipDurationMs : 0

  return (
    <main className="page page--fade-in">
      <header className="page-header">
        <p className="page-eyebrow">dev only</p>
        <h1 className="page-title page-title--sm">Spotify playback test</h1>
        <p className="page-subtitle">
          Connect Spotify Premium, paste a track, and play the first N seconds from 0:00.
          Multiplayer wiring comes in the next phase.
        </p>
      </header>

      <SketchCard tiltSeed="dev-spotify-auth">
        <h2 className="lobby-players__title">Spotify account</h2>
        {authStatus.connected ? (
          <p className="page-subtitle">
            ✓ Connected{authStatus.displayName ? ` as ${authStatus.displayName}` : ''}
            {authStatus.product ? ` · ${authStatus.product}` : ''}
          </p>
        ) : (
          <p className="page-subtitle">Not connected</p>
        )}

        {authStatus.premiumRequired ? (
          <p className="form-error">
            Web Playback usually requires Spotify Premium. Playback may fail on free accounts.
          </p>
        ) : null}

        {callbackError ? <p className="form-error">{decodeURIComponent(callbackError)}</p> : null}
        {playbackMessage ? <p className="form-error">{playbackMessage}</p> : null}

        <div className="setup-checks">
          {!authStatus.connected ? (
            <SketchButton disabled={busy} onClick={handleConnect}>
              Connect Spotify
            </SketchButton>
          ) : (
            <>
              <SketchButton variant="ghost" disabled={busy} onClick={handleInitializePlayer}>
                Initialize player
              </SketchButton>
              <SketchButton variant="ghost" disabled={busy} onClick={handleDisconnect}>
                Disconnect
              </SketchButton>
            </>
          )}
        </div>
      </SketchCard>

      <SketchCard tiltSeed="dev-spotify-track">
        <SketchInput
          label="Spotify track URL or URI"
          name="track"
          placeholder="https://open.spotify.com/track/… or spotify:track:…"
          value={trackInput}
          onChange={(event) => setTrackInput(event.target.value)}
        />

        <fieldset className="setup-fieldset">
          <legend>Song clip</legend>
          {CLIP_OPTIONS.map((option) => (
            <SketchRadio
              key={option.value}
              name="clipDuration"
              label={option.label}
              checked={clipDurationMs === option.value}
              onChange={() => setClipDurationMs(option.value)}
            />
          ))}
        </fieldset>

        <p className="page-subtitle">
          Player: {playbackState}
          {parsedUri ? ` · ${parsedUri}` : ''}
        </p>

        {playbackState === 'playing' ? (
          <div className="clip-player" aria-label="Playback progress">
            <div
              className="clip-player__wave clip-player__wave--playing"
              style={{ '--clip-progress': progress } as CSSProperties}
            >
              ♪ Playing on Spotify
            </div>
            <p className="clip-player__status clip-player__status--playing">
              {Math.ceil(elapsedMs / 1000)}s / {clipDurationMs / 1000}s
            </p>
          </div>
        ) : null}

        <SketchButton fullWidth disabled={busy || !authStatus.connected} onClick={handlePlayClip}>
          {busy ? 'Working…' : `Play first ${clipDurationMs / 1000} seconds`}
        </SketchButton>

        <SketchButton variant="ghost" fullWidth disabled={busy} onClick={handlePause}>
          Pause
        </SketchButton>
      </SketchCard>

      <SketchDivider />

      <Link to="/home">
        <SketchButton variant="ghost" fullWidth>
          Back home
        </SketchButton>
      </Link>
    </main>
  )
}
