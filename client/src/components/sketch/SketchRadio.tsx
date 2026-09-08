import type { InputHTMLAttributes } from 'react'
import { sketchClass } from './sketchUtils'

type SketchRadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
}

export function SketchRadio({ label, className, id, ...props }: SketchRadioProps) {
  const radioId = id || `${props.name}-${props.value}` || label

  return (
    <label className={sketchClass('sketch-radio', className)} htmlFor={radioId}>
      <input id={radioId} type="radio" className="sketch-radio__input" {...props} />
      <span className="sketch-radio__ring" aria-hidden />
      <span className="sketch-radio__label">{label}</span>
    </label>
  )
}
