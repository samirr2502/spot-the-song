type SketchScoreProps = {
  label: string
  value: number
  highlight?: boolean
}

export function SketchScore({ label, value, highlight }: SketchScoreProps) {
  return (
    <div className={`sketch-score${highlight ? ' sketch-score--highlight' : ''}`}>
      <span className="sketch-score__label">{label}</span>
      <span className="sketch-score__value">+{value}</span>
    </div>
  )
}
