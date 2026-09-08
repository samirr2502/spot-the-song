import type { InputHTMLAttributes } from 'react'
import { sketchClass, sketchTilt } from './sketchUtils'

type SketchInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
}

export function SketchInput({ label, className, id, ...props }: SketchInputProps) {
  const inputId = id || props.name || 'sketch-input'
  const tilt = sketchTilt(inputId, 0.6)

  return (
    <label className={sketchClass('sketch-field', className)} htmlFor={inputId}>
      {label ? <span className="sketch-field__label">{label}</span> : null}
      <input
        id={inputId}
        className="sketch-input"
        style={{ '--sketch-tilt': `${tilt}deg` } as React.CSSProperties}
        {...props}
      />
    </label>
  )
}
