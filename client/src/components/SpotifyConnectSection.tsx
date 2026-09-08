import { useEffect, useState } from 'react'
import { SketchButton, SketchCard, SketchRadio } from './sketch'
import {
  disconnectSpotify,
  fetchSpotifyStatus,
  startSpotifyLogin,
  type SpotifyAuthStatus,
} from '../lib/spotify/authApi'

type SpotifyConnectSectionProps = {
  returnTo: string
  clipDurationSeconds?: number
  onClipDurationChange?: (seconds: number) => void
  showClipDuration?: boolean
}

export function SpotifyConnectSection({
  returnTo,
  clipDurationSeconds = 30,
  onClipDurationChange,
  showClipDuration = true,
}: SpotifyConnectSectionProps) {
  const [authStatus, setAuthStatus] = useState<SpotifyAuthStatus>({ connected: false })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void refreshAuth()
  }, [])

  async function refreshAuth() {
    setAuthStatus(await fetchSpotifyStatus())
  }

  async function handleDisconnect() {
    setBusy(true)
    try {
      await disconnectSpotify()
      await refreshAuth()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <SketchCard tiltSeed="spotify-connect" className="spotify-connect">
        <p className="setup-fieldset__legend">Spotify (host playback)</p>
        {authStatus.connected ? (
          <>
            <p className="spotify-connect__status">
              ✓ Connected as {authStatus.displayName || 'Spotify user'}
            </p>
            {authStatus.premiumRequired ? (
              <p className="form-error">Premium may be required for in-browser playback.</p>
            ) : null}
            <SketchButton type="button" variant="ghost" fullWidth disabled={busy} onClick={handleDisconnect}>
              Disconnect Spotify
            </SketchButton>
          </>
        ) : (
          <>
            <p className="spotify-connect__hint">
              Connect your Spotify account to play real song clips during the game. Open this app at{' '}
              <strong>http://127.0.0.1:5173</strong> (Spotify does not allow localhost redirect URIs).
            </p>
            <SketchButton type="button" fullWidth onClick={() => startSpotifyLogin(returnTo)}>
              Connect Spotify
            </SketchButton>
          </>
        )}
      </SketchCard>

      {showClipDuration && onClipDurationChange ? (
        <fieldset className="setup-fieldset">
          <legend className="setup-fieldset__legend">Song clip</legend>
          <div className="setup-radios">
            <SketchRadio
              name="clipDuration"
              label="15 seconds"
              checked={clipDurationSeconds === 15}
              onChange={() => onClipDurationChange(15)}
            />
            <SketchRadio
              name="clipDuration"
              label="30 seconds"
              checked={clipDurationSeconds === 30}
              onChange={() => onClipDurationChange(30)}
            />
          </div>
        </fieldset>
      ) : null}
    </>
  )
}

export function useSpotifyConnected() {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetchSpotifyStatus()
      .then((status) => setConnected(status.connected))
      .finally(() => setLoading(false))
  }, [])

  return { connected, loading, refresh: async () => setConnected((await fetchSpotifyStatus()).connected) }
}
