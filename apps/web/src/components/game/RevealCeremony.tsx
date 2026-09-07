import { motion, AnimatePresence } from 'motion/react'
import type { RevealStage } from '../../hooks/useRevealSequence'

type RevealCeremonyProps = {
  stage: RevealStage
  children: React.ReactNode
}

export default function RevealCeremony({ stage, children }: RevealCeremonyProps) {
  const isRevealing = stage === 'revealing-title' || stage === 'revealing-year'

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stage}
        className="reveal-ceremony"
        initial={
          isRevealing
            ? { scale: 1, rotateY: 0 }
            : false
        }
        animate={
          stage === 'revealing-title'
            ? { scale: [1, 1.04, 1], rotateY: [0, 90, 0] }
            : stage === 'revealing-year'
              ? { scale: [1, 1.08, 1], rotateY: [0, 90, 0] }
              : stage === 'title'
                ? { scale: 1, boxShadow: 'var(--shadow-glow)' }
                : stage === 'year'
                  ? { scale: 1, boxShadow: '0 0 32px rgba(255, 215, 0, 0.25)' }
                  : { scale: 1 }
        }
        transition={{
          duration: stage.startsWith('revealing') ? 0.6 : 0.3,
          ease: 'easeInOut',
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
