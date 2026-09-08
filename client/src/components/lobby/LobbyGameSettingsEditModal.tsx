import { type FormEvent, useEffect, useMemo, useState } from 'react'
import {
  type GameSettings,
  type GuessFields,
  hasAtLeastOneGuessField,
} from '@spot-the-song/shared'
import { ClipDurationFieldset } from '../ClipDurationFieldset'
import { ExtraTimeAfterClipField, parseExtraSeconds } from '../ExtraTimeAfterClipField'
import { SingTimerFieldset } from '../SingTimerFieldset'
import { SketchButton, SketchCheckbox, SketchDivider, SketchInput } from '../sketch'
import { SketchModal } from '../sketch/SketchModal'

type LobbyGameSettingsEditModalProps = {
  open: boolean
  settings: GameSettings
  busy: boolean
  error: string | null
  onClose: () => void
  onSave: (settings: GameSettings) => void | Promise<void>
}

export function LobbyGameSettingsEditModal({
  open,
  settings,
  busy,
  error,
  onClose,
  onSave,
}: LobbyGameSettingsEditModalProps) {
  const [guessFields, setGuessFields] = useState<GuessFields>({ ...settings.guessFields })
  const [roundCount, setRoundCount] = useState(String(settings.roundCount))
  const [clipDurationSeconds, setClipDurationSeconds] = useState(settings.clipDurationSeconds)
  const [extraSeconds, setExtraSeconds] = useState(String(settings.guessTimerSeconds ?? 0))
  const [singTimerSeconds, setSingTimerSeconds] = useState(settings.singTimerSeconds ?? 45)
  const [localError, setLocalError] = useState<string | null>(null)

  const isAllIn = settings.playMode === 'all-in'
  const isTurnGuess = settings.playMode === 'turns' && settings.turnGame === 'guess'
  const isSingAlong = settings.playMode === 'turns' && settings.turnGame === 'sing'
  const isTimeline = settings.playMode === 'turns' && settings.turnGame === 'timeline'

  useEffect(() => {
    if (!open) return
    setGuessFields({ ...settings.guessFields })
    setRoundCount(String(settings.roundCount))
    setClipDurationSeconds(settings.clipDurationSeconds)
    setExtraSeconds(String(settings.guessTimerSeconds ?? 0))
    setSingTimerSeconds(settings.singTimerSeconds ?? 45)
    setLocalError(null)
  }, [open, settings])

  const nextSettings: GameSettings = useMemo(() => {
    const base: GameSettings = {
      ...settings,
      guessFields,
      roundCount: Number.parseInt(roundCount, 10) || 1,
    }

    if (isSingAlong) {
      return { ...base, singTimerSeconds }
    }

    return {
      ...base,
      clipDurationSeconds,
      guessTimerSeconds: parseExtraSeconds(extraSeconds),
    }
  }, [
    settings,
    guessFields,
    roundCount,
    clipDurationSeconds,
    extraSeconds,
    singTimerSeconds,
    isSingAlong,
  ])

  function toggleField(field: keyof GuessFields) {
    setGuessFields((current) => ({ ...current, [field]: !current[field] }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLocalError(null)

    if ((isAllIn || isTurnGuess) && !hasAtLeastOneGuessField(guessFields)) {
      setLocalError('Select at least one field to guess.')
      return
    }

    await onSave(nextSettings)
  }

  const displayError = localError || error

  return (
    <SketchModal open={open} title="Game settings" onClose={onClose}>
      <form className="setup-form" onSubmit={(event) => void handleSubmit(event)}>
        {isSingAlong ? (
          <>
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
          </>
        ) : null}

        {isAllIn || isTurnGuess || isTimeline ? (
          <ClipDurationFieldset
            clipDurationSeconds={clipDurationSeconds}
            onClipDurationChange={setClipDurationSeconds}
          />
        ) : null}

        {isAllIn || isTurnGuess || isTimeline ? (
          <SketchDivider label="round options" />
        ) : null}

        {isAllIn || isTurnGuess ? (
          <fieldset className="setup-fieldset">
            <legend className="setup-fieldset__legend">Players must guess</legend>
            <div className="setup-checks">
              <SketchCheckbox label="Title" checked={guessFields.title} onChange={() => toggleField('title')} />
              <SketchCheckbox label="Artist" checked={guessFields.artist} onChange={() => toggleField('artist')} />
              <SketchCheckbox label="Album" checked={guessFields.album} onChange={() => toggleField('album')} />
              <SketchCheckbox label="Year" checked={guessFields.year} onChange={() => toggleField('year')} />
            </div>
          </fieldset>
        ) : null}

        {isTimeline ? (
          <fieldset className="setup-fieldset">
            <legend className="setup-fieldset__legend">Optional bonus guesses</legend>
            <div className="setup-checks">
              <SketchCheckbox label="Title bonus" checked={guessFields.title} onChange={() => toggleField('title')} />
              <SketchCheckbox label="Artist bonus" checked={guessFields.artist} onChange={() => toggleField('artist')} />
            </div>
          </fieldset>
        ) : null}

        {!isSingAlong ? (
          <>
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
              extraSeconds={extraSeconds}
              onExtraSecondsChange={setExtraSeconds}
              purposeLabel={isTimeline ? 'place' : isTurnGuess ? 'guess' : 'answer'}
            />
          </>
        ) : null}

        {displayError ? <p className="form-error">{displayError}</p> : null}

        <SketchButton type="submit" fullWidth disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </SketchButton>
      </form>
    </SketchModal>
  )
}
