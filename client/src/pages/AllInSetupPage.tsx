import { type FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  DEFAULT_GAME_SETTINGS,
  DEFAULT_GUESS_FIELDS,
  type GameSettings,
  type GuessFields,
  hasAtLeastOneGuessField,
} from '@spot-the-song/shared'
import { ClipDurationFieldset } from '../components/ClipDurationFieldset'
import { ExtraTimeAfterClipField, parseExtraSeconds } from '../components/ExtraTimeAfterClipField'
import { MusicImportPreviewCard } from '../components/MusicImportPreviewCard'
import { SketchButton, SketchCard, SketchCheckbox, SketchDivider, SketchInput } from '../components/sketch'
import { useRoom } from '../context/RoomContext'
import { useSocketContext } from '../context/SocketContext'
import { previewMusicLink, type MusicPreviewResult } from '../lib/musicApi'
import { validateCollectionForLobby } from '../lib/lobbySetupValidation'

export function AllInSetupPage() {
  const navigate = useNavigate()
  const { connectionState } = useSocketContext()
  const { createRoom, error, busy, clearError } = useRoom()

  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [guessFields, setGuessFields] = useState<GuessFields>({ ...DEFAULT_GUESS_FIELDS })
  const [roundCount, setRoundCount] = useState(String(DEFAULT_GAME_SETTINGS.roundCount))
  const [clipDuration, setClipDuration] = useState(String(DEFAULT_GAME_SETTINGS.clipDurationSeconds))
  const [guessTimer, setGuessTimer] = useState(String(DEFAULT_GAME_SETTINGS.guessTimerSeconds ?? 0))
  const [localError, setLocalError] = useState<string | null>(null)
  const [preview, setPreview] = useState<MusicPreviewResult | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const clipDurationSeconds = Number.parseInt(clipDuration, 10) || 15

  const settings: GameSettings = useMemo(
    () => ({
      playMode: 'all-in',
      guessFields,
      roundCount: Number.parseInt(roundCount, 10) || 1,
      clipDurationSeconds,
      guessTimerSeconds: parseExtraSeconds(guessTimer),
    }),
    [guessFields, roundCount, clipDurationSeconds, guessTimer],
  )

  function toggleField(field: keyof GuessFields) {
    setGuessFields((current) => ({ ...current, [field]: !current[field] }))
  }

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

    if (!hasAtLeastOneGuessField(guessFields)) {
      setLocalError('Select at least one field to guess.')
      return
    }

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
        <h1 className="page-title page-title--sm">All In setup</h1>
        <p className="page-subtitle">Paste a Spotify playlist or album link — not a single track</p>
      </header>

      <SketchCard tiltSeed="all-in-setup">
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

          {preview ? <MusicImportPreviewCard preview={preview} tiltSeed="preview" /> : null}

          {previewError ? <p className="form-error">{previewError}</p> : null}

          <ClipDurationFieldset
            clipDurationSeconds={clipDurationSeconds}
            onClipDurationChange={(seconds) => setClipDuration(String(seconds))}
          />

          <SketchDivider label="game settings" />

          <fieldset className="setup-fieldset">
            <legend className="setup-fieldset__legend">Players must guess</legend>
            <div className="setup-checks">
              <SketchCheckbox
                label="Title"
                checked={guessFields.title}
                onChange={() => toggleField('title')}
              />
              <SketchCheckbox
                label="Artist"
                checked={guessFields.artist}
                onChange={() => toggleField('artist')}
              />
              <SketchCheckbox
                label="Album"
                checked={guessFields.album}
                onChange={() => toggleField('album')}
              />
              <SketchCheckbox
                label="Year"
                checked={guessFields.year}
                onChange={() => toggleField('year')}
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

          <ExtraTimeAfterClipField
            clipDurationSeconds={clipDurationSeconds}
            extraSeconds={guessTimer}
            onExtraSecondsChange={setGuessTimer}
            purposeLabel="answer"
          />

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

      <Link to="/create/mode">
        <SketchButton variant="ghost" fullWidth>
          Back
        </SketchButton>
      </Link>
    </main>
  )
}
