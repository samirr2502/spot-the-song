type SketchDividerProps = {
  label?: string
}

export function SketchDivider({ label }: SketchDividerProps) {
  return (
    <div className="sketch-divider" role="separator">
      {label ? <span className="sketch-divider__label">{label}</span> : null}
    </div>
  )
}
