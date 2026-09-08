import type { HTMLAttributes, ReactNode } from 'react'
import { sketchClass, sketchTilt } from './sketchUtils'

type SketchCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  tiltSeed?: string
}

export function SketchCard({ children, className, tiltSeed = 'card', ...props }: SketchCardProps) {
  const tilt = sketchTilt(tiltSeed, 0.8)

  return (
    <div
      className={sketchClass('sketch-card', className)}
      style={{ '--sketch-tilt': `${tilt}deg` } as React.CSSProperties}
      {...props}
    >
      {children}
    </div>
  )
}
