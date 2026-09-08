import { type FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  DEFAULT_GAME_SETTINGS,
  DEFAULT_TIMELINE_CARDS_TO_WIN,
  type GameSettings,
  type GuessFields,
} from '@spot-the-song/shared'
import { ClipDurationFieldset } from '../components/ClipDurationFieldset'
import { ExtraTimeAfterClipField, parseExtraSeconds } from '../components/ExtraTimeAfterClipField'
import { MusicImportPreviewCard } from '../components/MusicImportPreviewCard'
import { SketchButton, SketchCard, SketchCheckbox, SketchDivider, SketchInput } from '../components/sketch'
import { useRoom } from '../context/RoomContext'
import { useSocketContext } from '../context/SocketContext'
import { previewMusicLink, type MusicPreviewResult } from '../lib/musicApi'
import { validateCollectionForLobby } from '../lib/lobbySetupValidation'

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
  const [cardsToWin, setCardsToWin] = useState(
    String(DEFAULT_GAME_SETTINGS.cardsToWin ?? DEFAULT_TIMELINE_CARDS_TO_WIN),
  )
  const [clipDuration, setClipDuration] = useState(String(DEFAULT_GAME_SETTINGS.clipDurationSeconds))
  const [guessTimer, setGuessTimer] = useState(String(DEFAULT_GAME_SETTINGS.guessTimerSeconds ?? 0))
  const [localError, setLocalError] = useState<string | null>(null)
  const [preview, setPreview] = useState<MusicPreviewResult | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const clipDurationSeconds = Number.parseInt(clipDuration, 10) || 15

  const settings: GameSettings = useMemo(
    () => ({
      playMode: 'turns',
      turnGame: 'timeline',
      guessFields,
      roundCount: DEFAULT_GAME_SETTINGS.roundCount,
      cardsToWin: Number.parseInt(cardsToWin, 10) || DEFAULT_TIMELINE_CARDS_TO_WIN,
      clipDurationSeconds,
      guessTimerSeconds: parseExtraSeconds(guessTimer),
    }),
    [guessFields, cardsToWin, clipDurationSeconds, guessTimer],
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

      const minimumTracks = settings.cardsToWin ?? DEFAULT_TIMELINE_CARDS_TO_WIN
      if (result.totalTracks < minimumTracks) {
        setPreviewError(
          `Only ${result.totalTracks} tracks — need at least ${minimumTracks} for starter and earned cards.`,
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
            disabled={previewLoading || busy || !spotifyUrl.trim()}
            onClick={handlePreview}
          >
            {previewLoading ? 'Loading…' : 'Check link'}
          </SketchButton>

          {preview ? <MusicImportPreviewCard preview={preview} tiltSeed="preview-timeline" /> : null}

          {previewError ? <p className="form-error">{previewError}</p> : null}

          <ClipDurationFieldset
            clipDurationSeconds={clipDurationSeconds}
            onClipDurationChange={(seconds) => setClipDuration(String(seconds))}
          />

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
            label="Cards to win"
            name="cardsToWin"
            type="number"
            min={1}
            max={20}
            value={cardsToWin}
            onChange={(event) => setCardsToWin(event.target.value)}
          />

          <ExtraTimeAfterClipField
            clipDurationSeconds={clipDurationSeconds}
            extraSeconds={guessTimer}
            onExtraSecondsChange={setGuessTimer}
            purposeLabel="place"
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

      <Link to="/create/turns">
        <SketchButton variant="ghost" fullWidth>
          Back
        </SketchButton>
      </Link>
    </main>
  )
}
