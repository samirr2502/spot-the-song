import type { ReactNode } from 'react'

type SketchLayoutProps = {
  children: ReactNode
}

export function SketchLayout({ children }: SketchLayoutProps) {
  return (
    <div className="sketch-app">
      <div className="sketch-paper">{children}</div>
    </div>
  )
}
