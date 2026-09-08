import type { InputHTMLAttributes } from 'react'
import { sketchClass } from './sketchUtils'

type SketchCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
}

export function SketchCheckbox({ label, className, id, ...props }: SketchCheckboxProps) {
  const checkboxId = id || props.name || label

  return (
    <label className={sketchClass('sketch-check', className)} htmlFor={checkboxId}>
      <input id={checkboxId} type="checkbox" className="sketch-check__input" {...props} />
      <span className="sketch-check__box" aria-hidden />
      <span className="sketch-check__label">{label}</span>
    </label>
  )
}
