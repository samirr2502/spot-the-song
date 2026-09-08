import { SketchRadio } from './sketch'

const SING_TIMER_OPTIONS = [15, 30, 45, 60] as const

type SingTimerFieldsetProps = {
  singTimerSeconds: number
  onSingTimerChange: (seconds: number) => void
}

export function SingTimerFieldset({ singTimerSeconds, onSingTimerChange }: SingTimerFieldsetProps) {
  return (
    <fieldset className="setup-fieldset">
      <legend className="setup-fieldset__legend">Performance time</legend>
      <p className="setup-fieldset__hint">
        How long the performer has to sing. Voting starts when the host taps Start voting.
      </p>
      <div className="setup-radios">
        {SING_TIMER_OPTIONS.map((seconds) => (
          <SketchRadio
            key={seconds}
            name="singTimer"
            value={String(seconds)}
            label={`${seconds} seconds`}
            checked={singTimerSeconds === seconds}
            onChange={() => onSingTimerChange(seconds)}
          />
        ))}
      </div>
    </fieldset>
  )
}
