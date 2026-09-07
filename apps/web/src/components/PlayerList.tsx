import type { Player } from '@spot-the-song/game-engine'

type PlayerListProps = {
  players: Player[]
  activePlayerId?: string
}

export default function PlayerList({ players, activePlayerId }: PlayerListProps) {
  const sorted = [...players].sort((a, b) => a.order - b.order)

  return (
    <div className="stack">
      {sorted.map((player) => (
        <div
          key={player.id}
          className={`player-card${player.id === activePlayerId ? ' active' : ''}`}
        >
          <div>
            <strong>{player.name}</strong>
            {player.id === activePlayerId && (
              <span className="badge active" style={{ marginLeft: '0.5rem' }}>
                Turn
              </span>
            )}
          </div>
          <span className="score">{player.score}</span>
        </div>
      ))}
    </div>
  )
}
