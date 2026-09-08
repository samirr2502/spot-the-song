import { type FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DEFAULT_GAME_SETTINGS, type GameSettings } from '@spot-the-song/shared'
import { SingTimerFieldset } from '../components/SingTimerFieldset'
import { SketchButton, SketchCard, SketchDivider, SketchInput } from '../components/sketch'
import { useRoom } from '../context/RoomContext'
import { useSocketContext } from '../context/SocketContext'
import { previewMusicLink, type MusicPreviewResult } from '../lib/musicApi'
import { validateCollectionForLobby } from '../lib/lobbySetupValidation'

export function SingAlongSetupPage() {
  const navigate = useNavigate()
  const { connectionState } = useSocketContext()
  const { createRoom, error, busy, clearError } = useRoom()

  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [roundCount, setRoundCount] = useState(String(DEFAULT_GAME_SETTINGS.roundCount))
  const [singTimerSeconds, setSingTimerSeconds] = useState(DEFAULT_GAME_SETTINGS.singTimerSeconds ?? 45)
  const [localError, setLocalError] = useState<string | null>(null)
  const [preview, setPreview] = useState<MusicPreviewResult | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const settings: GameSettings = useMemo(
    () => ({
      playMode: 'turns',
      turnGame: 'sing',
      guessFields: DEFAULT_GAME_SETTINGS.guessFields,
      roundCount: Number.parseInt(roundCount, 10) || 1,
      clipDurationSeconds: DEFAULT_GAME_SETTINGS.clipDurationSeconds,
      singTimerSeconds,
      playbackMode: 'preview',
    }),
    [roundCount, singTimerSeconds],
  )

  async function handlePreview() {
    setPreviewError(null)
    setPreview(null)

    if (!spotifyUrl.trim()) {
      setPreviewError('Paste a Spotify playlist or album link first.')
      return
    }

    setPreviewLoading(true)

    try {
      const result = await previewMusicLink(spotifyUrl)
      setPreview(result)

      if (result.totalTracks < settings.roundCount) {
        setPreviewError(
          `Only ${result.totalTracks} tracks — lower rounds to ${result.totalTracks} or fewer.`,
        )
      }
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Could not load link')
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    clearError()
    setLocalError(null)

    const collectionError = validateCollectionForLobby(spotifyUrl, preview)
    if (collectionError) {
      setLocalError(collectionError)
      return
    }

    const result = await createRoom(settings, spotifyUrl.trim())
    if (result) {
      navigate(`/room/${result.code}`)
    }
  }

  const displayError = localError || error

  return (
    <main className="page">
      <header className="page-header">
        <h1 className="page-title page-title--sm">Sing Along setup</h1>
        <p className="page-subtitle">
          Take turns singing mystery songs — performers open a blind Spotify link without seeing the title
        </p>
      </header>

      <SketchCard tiltSeed="sing-setup">
        <form className="setup-form" onSubmit={handleSubmit}>
          <SketchInput
            label="Spotify playlist or album link"
            name="spotifyUrl"
            placeholder="https://open.spotify.com/playlist/…"
            value={spotifyUrl}
            onChange={(event) => {
              setSpotifyUrl(event.target.value)
              setPreview(null)
              setPreviewError(null)
            }}
            autoComplete="off"
          />

          <SketchButton
            type="button"
            variant="ghost"
            fullWidth
            disabled={previewLoading || busy || !spotifyUrl.trim()}
            onClick={handlePreview}
          >
            {previewLoading ? 'Loading…' : 'Check link'}
          </SketchButton>

          {preview ? (
            <SketchCard tiltSeed="preview-sing" className="music-preview">
              <p className="music-preview__name">{preview.name}</p>
              <p className="music-preview__meta">
                {preview.totalTracks} tracks · {preview.playableCount} playable on Spotify
                {preview.skippedCount > 0 ? ` · ${preview.skippedCount} without preview` : ''}
              </p>
              <p className="music-preview__source">
                {preview.source === 'spotify' ? 'Spotify' : 'Demo playlist'}
              </p>
            </SketchCard>
          ) : null}

          {previewError ? <p className="form-error">{previewError}</p> : null}

          <SketchDivider label="game settings" />

          <SketchInput
            label="Number of rounds"
            name="roundCount"
            type="number"
            min={1}
            max={20}
            value={roundCount}
            onChange={(event) => setRoundCount(event.target.value)}
          />

          <SingTimerFieldset
            singTimerSeconds={singTimerSeconds}
            onSingTimerChange={setSingTimerSeconds}
          />

          <p className="setup-fieldset__hint">
            The performer opens Spotify on their device. Voting starts when the host taps Start voting.
          </p>

          {displayError ? <p className="form-error">{displayError}</p> : null}

          {connectionState !== 'connected' ? (
            <p className="form-error">Wait for Socket: Live in the corner before creating a lobby.</p>
          ) : null}

          <SketchButton
            type="submit"
            fullWidth
            disabled={busy || previewLoading || connectionState !== 'connected' || !preview}
          >
            {busy ? 'Loading music & creating…' : 'Create lobby'}
          </SketchButton>
        </form>
      </SketchCard>

      <SketchDivider />

      <Link to="/create/turns">
        <SketchButton variant="ghost" fullWidth>
          Back
        </SketchButton>
      </Link>
    </main>
  )
}
