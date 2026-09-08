import { SketchRadio } from './sketch'

type ClipDurationFieldsetProps = {
  clipDurationSeconds: number
  onClipDurationChange: (seconds: number) => void
}

export function ClipDurationFieldset({
  clipDurationSeconds,
  onClipDurationChange,
}: ClipDurationFieldsetProps) {
  return (
    <fieldset className="setup-fieldset">
      <legend className="setup-fieldset__legend">Song clip</legend>
      <p className="setup-fieldset__hint">
        Preview clips may not start at the beginning of the song. Tracks without a preview can be
        opened in Spotify during the round.
      </p>
      <div className="setup-radios">
        <SketchRadio
          name="clipDuration"
          value="15"
          label="15 seconds"
          checked={clipDurationSeconds === 15}
          onChange={() => onClipDurationChange(15)}
        />
        <SketchRadio
          name="clipDuration"
          value="30"
          label="30 seconds"
          checked={clipDurationSeconds === 30}
          onChange={() => onClipDurationChange(30)}
        />
      </div>
    </fieldset>
  )
}
