import type { GameState } from '@spot-the-song/game-engine'
import { getActivePlayer, getRemainingSeconds } from '@spot-the-song/game-engine'

type TurnBannerProps = {
  game: GameState
  now: number
}

export default function TurnBanner({ game, now }: TurnBannerProps) {
  const activePlayer = getActivePlayer(game)
  const remaining = getRemainingSeconds(game, now)
  const timerClass =
    remaining <= 5 ? 'timer expired' : remaining <= 10 ? 'timer warning' : 'timer'

  if (game.phase === 'finished') {
    return (
      <div className="turn-banner">
        <h2>Game Over</h2>
        <p className="muted">All songs have been played.</p>
      </div>
    )
  }

  if (game.phase === 'reveal') {
    const correct = game.currentTurn?.isCorrect
    return (
      <div className="turn-banner">
        <h2>{correct ? 'Correct!' : 'Wrong!'}</h2>
        <p className="muted">
          {correct ? '+1 point' : 'No points this round'}
        </p>
      </div>
    )
  }

  return (
    <div className="turn-banner">
      <h2>{activePlayer?.name}&apos;s turn</h2>
      <div className={timerClass}>{remaining}s</div>
      <p className="muted">Guess the song title or artist</p>
    </div>
  )
}
