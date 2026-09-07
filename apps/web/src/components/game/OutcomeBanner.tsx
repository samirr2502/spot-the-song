import type { GameState } from '@spot-the-song/game-engine'
import { getSongById } from '@spot-the-song/game-engine'
import { motion } from 'motion/react'

type OutcomeBannerProps = {
  game: GameState
}

export default function OutcomeBanner({ game }: OutcomeBannerProps) {
  const resolution = game.lastClaimResolution
  if (!resolution) return null

  const song = getSongById(game, resolution.songId)
  const winner = resolution.awardedTo
    ? game.players.find((p) => p.id === resolution.awardedTo)?.name
    : null

  let variant: 'success' | 'warning' | 'neutral' = 'neutral'
  let headline = ''
  let detail = ''

  if (resolution.discarded) {
    variant = 'warning'
    headline = 'Discarded'
    detail = 'Wrong placement, no challenge'
  } else if (resolution.placementCorrect && winner) {
    variant = 'success'
    headline = `${winner} keeps it`
    detail = `${resolution.releaseYear}`
  } else if (winner) {
    variant = 'success'
    headline = `${winner} wins challenge`
    detail = `${resolution.releaseYear}`
  }

  if (resolution.guessCorrect) {
    detail += ` · +${resolution.coinsAwarded} coin`
  }

  return (
    <motion.div
      className={`outcome-banner outcome-banner--${variant}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="outcome-banner__year">{resolution.releaseYear}</div>
      <div className="outcome-banner__content">
        <span className="outcome-banner__headline">{headline}</span>
        {song && <span className="outcome-banner__song">{song.title}</span>}
        {detail && <span className="outcome-banner__detail">{detail}</span>}
      </div>
    </motion.div>
  )
}
