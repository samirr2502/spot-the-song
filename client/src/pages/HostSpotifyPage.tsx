import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { SpotifyConnectSection, useSpotifyConnected } from '../components/SpotifyConnectSection'
import { SketchButton, SketchCard, SketchDivider } from '../components/sketch'
import { setFullPlaybackEnabled } from '../lib/playbackMode'

export function HostSpotifyPage() {
  const [searchParams] = useSearchParams()
  const { connected, loading, refresh } = useSpotifyConnected()
  const [fullPlaybackEnabled, setFullPlaybackEnabledState] = useState(false)
  const callbackConnected = searchParams.get('connected') === '1'
  const callbackError = searchParams.get('error')

  useEffect(() => {
    if (callbackConnected) {
      void refresh().then(() => {
        setFullPlaybackEnabled(true)
        setFullPlaybackEnabledState(true)
      })
    }
  }, [callbackConnected, refresh])

  useEffect(() => {
    if (!loading && connected) {
      setFullPlaybackEnabled(true)
      setFullPlaybackEnabledState(true)
    }
  }, [connected, loading])

  function handleDisableFullPlayback() {
    setFullPlaybackEnabled(false)
    setFullPlaybackEnabledState(false)
  }

  return (
    <main className="page page--fade-in">
      <header className="page-header">
        <p className="page-eyebrow">beta</p>
        <h1 className="page-title page-title--sm">Full Spotify playback</h1>
        <p className="page-subtitle">
          Connect Spotify to play song clips from the beginning during games. This page is not part
          of the normal setup flow.
        </p>
      </header>

      <SketchCard tiltSeed="host-spotify-beta">
        <p className="spotify-connect__hint">
          Beta access requires your Spotify account to be on the app allowlist. Email the developer
          to request access before connecting.
        </p>
        <SpotifyConnectSection returnTo="/host/spotify" showClipDuration={false} />
      </SketchCard>

      {callbackError ? (
        <p className="form-error">{decodeURIComponent(callbackError)}</p>
      ) : null}

      {fullPlaybackEnabled && connected ? (
        <SketchCard tiltSeed="host-spotify-enabled" className="lobby-wait-card">
          <p>Full playback is enabled for your next lobby.</p>
          <p className="spotify-connect__hint">
            Create a game as usual — clips will auto-play from 0:00 on your device.
          </p>
          <Link to="/create/mode">
            <SketchButton fullWidth>Create a game</SketchButton>
          </Link>
          <SketchButton variant="ghost" fullWidth onClick={handleDisableFullPlayback}>
            Use preview mode instead
          </SketchButton>
        </SketchCard>
      ) : null}

      <SketchDivider />

      <Link to="/home">
        <SketchButton variant="ghost" fullWidth>
          Back home
        </SketchButton>
      </Link>
    </main>
  )
}
