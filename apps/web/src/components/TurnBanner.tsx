import type { GameState } from '@spot-the-song/game-engine'
import { getActivePlayer, getRemainingSeconds } from '@spot-the-song/game-engine'

type TurnBannerProps = {
  game: GameState
  now: number
  variant?: 'default' | 'compact'
}

export default function TurnBanner({ game, now, variant = 'default' }: TurnBannerProps) {
  const compact = variant === 'compact'
  const bannerClass = compact ? 'turn-banner turn-banner--compact' : 'turn-banner'
  const activePlayer = getActivePlayer(game)
  const remaining = getRemainingSeconds(game, now)

  if (game.phase === 'finished') {
    return (
      <div className={bannerClass}>
        <h2>Game Over</h2>
        {!compact && <p className="muted">All songs have been played.</p>}
      </div>
    )
  }

  if (game.phase === 'challenge') {
    return (
      <div className={bannerClass}>
        <h2>Challenge window</h2>
        {!compact && (
          <p className="muted">
            {activePlayer?.name} can still name the song for a coin. Others may spend 1 coin to
            challenge before the year is revealed.
          </p>
        )}
      </div>
    )
  }

  if (game.phase === 'reveal') {
    const resolution = game.lastClaimResolution
    return (
      <div className={bannerClass}>
        <h2>Turn result</h2>
        {!compact && (
          <p className="muted">
            {resolution?.placementCorrect
              ? `${activePlayer?.name} keeps the card on their timeline.`
              : resolution?.awardedTo
                ? 'Wrong placement — challenger collects the card.'
                : 'Wrong placement — card discarded.'}
            {resolution?.guessCorrect && ` +${resolution.coinsAwarded} coin for naming the song.`}
          </p>
        )}
      </div>
    )
  }

  const timerClass =
    remaining <= 5 ? 'timer expired' : remaining <= 10 ? 'timer warning' : 'timer'

  return (
    <div className={bannerClass}>
      <h2>
        {activePlayer?.name}&apos;s turn
        {compact && (
          <>
            {' · '}
            <span className={timerClass}>{remaining}s</span>
          </>
        )}
      </h2>
      {!compact && (
        <>
          <div className={timerClass}>{remaining}s</div>
          <p className="muted">
            Guess the title or artist for a coin, then place the card on your timeline.
          </p>
        </>
      )}
    </div>
  )
}
