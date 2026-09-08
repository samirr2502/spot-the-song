import type { InputHTMLAttributes } from 'react'
import { sketchClass } from './sketchUtils'

type SketchRadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
}

function sketchRadioId(name: string | undefined, value: string | number | readonly string[] | undefined, label: string) {
  const slug = (part: string) => part.trim().toLowerCase().replace(/\s+/g, '-')
  return [name ?? 'radio', value ?? label].map((part) => slug(String(part))).join('-')
}

export function SketchRadio({ label, className, id, ...props }: SketchRadioProps) {
  const radioId = id ?? sketchRadioId(props.name, props.value, label)

  return (
    <label className={sketchClass('sketch-radio', className)} htmlFor={radioId}>
      <input id={radioId} type="radio" className="sketch-radio__input" {...props} />
      <span className="sketch-radio__ring" aria-hidden />
      <span className="sketch-radio__label">{label}</span>
    </label>
  )
}
