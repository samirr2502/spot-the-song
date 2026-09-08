import { type FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  DEFAULT_GAME_SETTINGS,
  DEFAULT_GUESS_FIELDS,
  type GameSettings,
  type GuessFields,
  hasAtLeastOneGuessField,
} from '@spot-the-song/shared'
import { SketchButton, SketchCard, SketchCheckbox, SketchDivider, SketchInput } from '../components/sketch'
import { useRoom } from '../context/RoomContext'

export function AllInSetupPage() {
  const navigate = useNavigate()
  const { createRoom, error, busy, clearError } = useRoom()

  const [guessFields, setGuessFields] = useState<GuessFields>({ ...DEFAULT_GUESS_FIELDS })
  const [roundCount, setRoundCount] = useState(String(DEFAULT_GAME_SETTINGS.roundCount))
  const [clipDuration, setClipDuration] = useState(String(DEFAULT_GAME_SETTINGS.clipDurationSeconds))
  const [guessTimer, setGuessTimer] = useState(String(DEFAULT_GAME_SETTINGS.guessTimerSeconds ?? 30))
  const [localError, setLocalError] = useState<string | null>(null)

  const settings: GameSettings = useMemo(
    () => ({
      playMode: 'all-in',
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    clearError()
    setLocalError(null)

    if (!hasAtLeastOneGuessField(guessFields)) {
      setLocalError('Select at least one field to guess.')
      return
    }

    const result = await createRoom(settings)
    if (result) {
      navigate(`/room/${result.code}`)
    }
  }

  const displayError = localError || error

  return (
    <main className="page">
      <header className="page-header">
        <h1 className="page-title page-title--sm">All In setup</h1>
        <p className="page-subtitle">Mock playlist for now — Spotify in Phase 3</p>
      </header>

      <SketchCard tiltSeed="all-in-setup">
        <form className="setup-form" onSubmit={handleSubmit}>
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
            label="Answer time (seconds)"
            name="guessTimer"
            type="number"
            min={10}
            max={120}
            value={guessTimer}
            onChange={(event) => setGuessTimer(event.target.value)}
          />

          {displayError ? <p className="form-error">{displayError}</p> : null}

          <SketchButton type="submit" fullWidth disabled={busy}>
            {busy ? 'Creating…' : 'Create lobby'}
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
