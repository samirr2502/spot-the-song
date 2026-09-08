import { type FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DEFAULT_GAME_SETTINGS, type GameSettings } from '@spot-the-song/shared'
import { SketchButton, SketchCard, SketchDivider, SketchInput } from '../components/sketch'
import { useRoom } from '../context/RoomContext'
import { useSocketContext } from '../context/SocketContext'
import { previewMusicLink, type MusicPreviewResult } from '../lib/musicApi'

export function SingAlongSetupPage() {
  const navigate = useNavigate()
  const { connectionState } = useSocketContext()
  const { createRoom, error, busy, clearError } = useRoom()

  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [roundCount, setRoundCount] = useState(String(DEFAULT_GAME_SETTINGS.roundCount))
  const [clipDuration, setClipDuration] = useState(String(DEFAULT_GAME_SETTINGS.clipDurationSeconds))
  const [singTimer, setSingTimer] = useState(String(DEFAULT_GAME_SETTINGS.singTimerSeconds ?? 45))
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
      clipDurationSeconds: Number.parseInt(clipDuration, 10) || 15,
      singTimerSeconds: Number.parseInt(singTimer, 10) || 45,
    }),
    [roundCount, clipDuration, singTimer],
  )

  async function handlePreview() {
    setPreviewError(null)
    setPreview(null)
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

    const result = await createRoom(settings, spotifyUrl.trim() || undefined)
    if (result) {
      navigate(`/room/${result.code}`)
    }
  }

  const displayError = localError || error

  return (
    <main className="page">
      <header className="page-header">
        <h1 className="page-title page-title--sm">Sing Along setup</h1>
        <p className="page-subtitle">Take turns performing — everyone else rates the show</p>
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
            disabled={previewLoading || busy}
            onClick={handlePreview}
          >
            {previewLoading ? 'Loading…' : spotifyUrl.trim() ? 'Check link' : 'Preview demo playlist'}
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

          <SketchInput
            label="Clip duration (seconds)"
            name="clipDuration"
            type="number"
            min={5}
            max={60}
            value={clipDuration}
            onChange={(event) => setClipDuration(event.target.value)}
          />

          <SketchInput
            label="Performance time (seconds)"
            name="singTimer"
            type="number"
            min={15}
            max={180}
            value={singTimer}
            onChange={(event) => setSingTimer(event.target.value)}
          />

          {displayError ? <p className="form-error">{displayError}</p> : null}

          {connectionState !== 'connected' ? (
            <p className="form-error">Wait for Socket: Live in the corner before creating a lobby.</p>
          ) : null}

          <SketchButton type="submit" fullWidth disabled={busy || previewLoading || connectionState !== 'connected'}>
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
