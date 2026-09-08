import { SketchInput } from './sketch'

type ExtraTimeAfterClipFieldProps = {
  clipDurationSeconds: number
  extraSeconds: string
  onExtraSecondsChange: (value: string) => void
  /** e.g. "guess", "answer", "placement" */
  purposeLabel: string
}

export function parseExtraSeconds(value: string): number {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed < 0) return 0
  return parsed
}

export function ExtraTimeAfterClipField({
  clipDurationSeconds,
  extraSeconds,
  onExtraSecondsChange,
  purposeLabel,
}: ExtraTimeAfterClipFieldProps) {
  const extra = parseExtraSeconds(extraSeconds)
  const total = clipDurationSeconds + extra

  return (
    <div className="extra-time-field">
      <SketchInput
        label={`Extra ${purposeLabel} time after clip (seconds)`}
        name="guessTimer"
        type="number"
        min={0}
        max={120}
        value={extraSeconds}
        onChange={(event) => onExtraSecondsChange(event.target.value)}
      />
      <p className="setup-fieldset__hint">
        {clipDurationSeconds}s clip + {extra}s extra = {total}s total to {purposeLabel}
        {extra === 0 ? ' (clip only)' : ''}
      </p>
    </div>
  )
}
