import { type FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  DEFAULT_GAME_SETTINGS,
  type GameSettings,
  type GuessFields,
} from '@spot-the-song/shared'
import { SketchButton, SketchCard, SketchCheckbox, SketchDivider, SketchInput } from '../components/sketch'
import { useRoom } from '../context/RoomContext'
import { useSocketContext } from '../context/SocketContext'
import { previewMusicLink, type MusicPreviewResult } from '../lib/musicApi'

export function TimelineSetupPage() {
  const navigate = useNavigate()
  const { connectionState } = useSocketContext()
  const { createRoom, error, busy, clearError } = useRoom()

  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [guessFields, setGuessFields] = useState<GuessFields>({
    title: true,
    artist: true,
    album: false,
    year: false,
  })
  const [roundCount, setRoundCount] = useState(String(DEFAULT_GAME_SETTINGS.roundCount))
  const [clipDuration, setClipDuration] = useState(String(DEFAULT_GAME_SETTINGS.clipDurationSeconds))
  const [guessTimer, setGuessTimer] = useState(String(DEFAULT_GAME_SETTINGS.guessTimerSeconds ?? 30))
  const [localError, setLocalError] = useState<string | null>(null)
  const [preview, setPreview] = useState<MusicPreviewResult | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const settings: GameSettings = useMemo(
    () => ({
      playMode: 'turns',
      turnGame: 'timeline',
      guessFields,
      roundCount: Number.parseInt(roundCount, 10) || 1,
      clipDurationSeconds: Number.parseInt(clipDuration, 10) || 15,
      guessTimerSeconds: Number.parseInt(guessTimer, 10) || 30,
    }),
    [guessFields, roundCount, clipDuration, guessTimer],
  )

  function toggleField(field: keyof GuessFields) {
    setGuessFields((current) => ({ ...current, [field]: !current[field] }))
  }

  async function handlePreview() {
    setPreviewError(null)
    setPreview(null)
    setPreviewLoading(true)

    try {
      const result = await previewMusicLink(spotifyUrl)
      setPreview(result)

      const minimumTracks = settings.roundCount + 1
      if (result.totalTracks < minimumTracks) {
        setPreviewError(
          `Only ${result.totalTracks} tracks — need at least ${minimumTracks} for starters and rounds.`,
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
        <h1 className="page-title page-title--sm">Timeline setup</h1>
        <p className="page-subtitle">Place songs in chronological order on your personal timeline</p>
      </header>

      <SketchCard tiltSeed="timeline-setup">
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
            <SketchCard tiltSeed="preview-timeline" className="music-preview">
              <p className="music-preview__name">{preview.name}</p>
              <p className="music-preview__meta">
                {preview.totalTracks} tracks · {preview.playableCount} with previews
              </p>
            </SketchCard>
          ) : null}

          {previewError ? <p className="form-error">{previewError}</p> : null}

          <SketchDivider label="game settings" />

          <fieldset className="setup-fieldset">
            <legend className="setup-fieldset__legend">Optional bonus guesses</legend>
            <div className="setup-checks">
              <SketchCheckbox
                label="Title bonus"
                checked={guessFields.title}
                onChange={() => toggleField('title')}
              />
              <SketchCheckbox
                label="Artist bonus"
                checked={guessFields.artist}
                onChange={() => toggleField('artist')}
              />
            </div>
          </fieldset>

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
            label="Listen time (seconds)"
            name="clipDuration"
            type="number"
            min={5}
            max={60}
            value={clipDuration}
            onChange={(event) => setClipDuration(event.target.value)}
          />

          <SketchInput
            label="Placement time (seconds)"
            name="guessTimer"
            type="number"
            min={10}
            max={120}
            value={guessTimer}
            onChange={(event) => setGuessTimer(event.target.value)}
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
