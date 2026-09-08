import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { sketchClass, sketchTilt } from './sketchUtils'

type SketchButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: 'primary' | 'ghost'
  fullWidth?: boolean
}

export function SketchButton({
  children,
  className,
  variant = 'primary',
  fullWidth,
  ...props
}: SketchButtonProps) {
  const tilt = sketchTilt(String(children))

  return (
    <button
      type="button"
      className={sketchClass(
        'sketch-btn',
        variant === 'ghost' && 'sketch-btn--ghost',
        fullWidth && 'sketch-btn--full',
        className,
      )}
      style={{ '--sketch-tilt': `${tilt}deg` } as CSSProperties}
      {...props}
    >
      <span className="sketch-btn__label">{children}</span>
    </button>
  )
}
