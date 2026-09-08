import type { ReactNode } from 'react'
import { SketchButton } from './SketchButton'
import { SketchCard } from './SketchCard'

type SketchModalProps = {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
}

export function SketchModal({ open, title, children, onClose }: SketchModalProps) {
  if (!open) return null

  return (
    <div className="sketch-modal-backdrop" role="presentation" onClick={onClose}>
      <SketchCard
        className="sketch-modal"
        tiltSeed={title}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sketch-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="sketch-modal-title" className="sketch-modal__title">
          {title}
        </h2>
        <div className="sketch-modal__body">{children}</div>
        <SketchButton variant="ghost" onClick={onClose} className="sketch-modal__close">
          Close
        </SketchButton>
      </SketchCard>
    </div>
  )
}
