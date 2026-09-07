import type { GameState } from '@spot-the-song/game-engine'
import { getScoreboard } from '@spot-the-song/game-engine'

type ScoreboardProps = {
  game: GameState
}

export default function Scoreboard({ game }: ScoreboardProps) {
  const board = getScoreboard(game)

  return (
    <div className="card-panel">
      <h3 className="card-title">Scoreboard</h3>
      <ol className="scoreboard-list">
        {board.map((player, index) => (
          <li key={player.id}>
            <span>
              #{index + 1} {player.name}
            </span>
            <strong>{player.score}</strong>
          </li>
        ))}
      </ol>
    </div>
  )
}
