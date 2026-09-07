import type { GameState } from '@spot-the-song/game-engine'
import { countCollectedCards, getRemainingSeconds } from '@spot-the-song/game-engine'

type PlayerAvatarBarProps = {
  game: GameState
  activePlayerId: string
  localPlayerId?: string
  mode: 'local' | 'online'
  now?: number
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

export default function PlayerAvatarBar({
  game,
  activePlayerId,
  localPlayerId,
  mode,
  now,
}: PlayerAvatarBarProps) {
  const sorted = [...game.players].sort((a, b) => a.order - b.order)
  const showTimer = game.phase === 'playing' && now !== undefined

  return (
    <div className="player-avatar-bar" role="list" aria-label="Players">
      {sorted.map((player) => {
        const board = game.boards[player.id]
        const cards = board ? countCollectedCards(board) : 0
        const isActive = player.id === activePlayerId
        const isYou =
          mode === 'online' ? player.id === localPlayerId : player.id === activePlayerId
        const remaining = showTimer && isActive ? getRemainingSeconds(game, now) : null
        const timerClass =
          remaining !== null
            ? remaining <= 5
              ? 'player-avatar-bar__timer--expired'
              : remaining <= 10
                ? 'player-avatar-bar__timer--warning'
                : ''
            : ''

        return (
          <div
            key={player.id}
            role="listitem"
            className={[
              'player-avatar-bar__item',
              isActive ? 'player-avatar-bar__item--active' : '',
              isYou ? 'player-avatar-bar__item--you' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {isYou && <span className="player-avatar-bar__you-label">You</span>}
            <div className="player-avatar-bar__avatar-wrap">
              <div className="player-avatar-bar__avatar" aria-hidden="true">
                {getInitials(player.name)}
              </div>
              {remaining !== null && (
                <span className={['player-avatar-bar__timer', timerClass].filter(Boolean).join(' ')}>
                  {remaining}s
                </span>
              )}
            </div>
            <span className="player-avatar-bar__name">{player.name}</span>
            <span className="player-avatar-bar__score">
              <span className="player-avatar-bar__score-value">{cards}</span>
              <span className="player-avatar-bar__score-label">
                {cards} {cards === 1 ? 'card' : 'cards'} won
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
