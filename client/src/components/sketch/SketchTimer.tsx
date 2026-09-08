type SketchTimerProps = {
  secondsRemaining: number
  totalSeconds: number
  label?: string
}

export function SketchTimer({ secondsRemaining, totalSeconds, label }: SketchTimerProps) {
  const clamped = Math.max(0, secondsRemaining)
  const progress = totalSeconds > 0 ? clamped / totalSeconds : 0

  return (
    <div className="sketch-timer" aria-label={label || 'Timer'}>
      {label ? <span className="sketch-timer__label">{label}</span> : null}
      <div className="sketch-timer__ring" style={{ '--timer-progress': progress } as React.CSSProperties}>
        <span className="sketch-timer__value">{clamped}</span>
      </div>
    </div>
  )
}
