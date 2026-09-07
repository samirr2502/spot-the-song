import type { GameState } from '@spot-the-song/game-engine'
import { countCollectedCards, getScoreboard } from '@spot-the-song/game-engine'

type ScoreboardProps = {
  game: GameState
}

export default function Scoreboard({ game }: ScoreboardProps) {
  const board = getScoreboard(game)

  return (
    <div className="card-panel">
      <h3 className="card-title">Scoreboard</h3>
      <ol className="scoreboard-list">
        {board.map((player, index) => {
          const playerBoard = game.boards[player.id]
          const cards = playerBoard ? countCollectedCards(playerBoard) : 0
          const coins = playerBoard?.coins ?? 0

          return (
            <li key={player.id}>
              <span>
                #{index + 1} {player.name}
              </span>
              <strong>
                {cards} cards · {coins} coins
              </strong>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
