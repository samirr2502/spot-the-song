import type { GameState } from '@spot-the-song/game-engine'
import { CHALLENGE_COST } from '@spot-the-song/game-engine'

type PhaseActionBarProps = {
  game: GameState
  mode: 'local' | 'online'
  isMyTurn?: boolean
  isHost?: boolean
  selectedInsertIndex: number | null
  onConfirmPlacement?: () => void
  onChallenge?: (playerId: string) => void
  onReveal?: () => void
  onAdvance?: () => void
  challengerPlayerId?: string
}

export default function PhaseActionBar({
  game,
  mode,
  isMyTurn = true,
  isHost = true,
  selectedInsertIndex,
  onConfirmPlacement,
  onChallenge,
  onReveal,
  onAdvance,
  challengerPlayerId,
}: PhaseActionBarProps) {
  const claim = game.pendingClaim

  if (game.phase === 'playing' && isMyTurn) {
    return (
      <div className="phase-action-bar">
        <button
          type="button"
          className="btn btn-primary btn-lg phase-action-bar__btn"
          disabled={selectedInsertIndex === null}
          onClick={onConfirmPlacement}
        >
          Confirm placement
        </button>
      </div>
    )
  }

  if (game.phase === 'playing' && !isMyTurn && mode === 'online') {
    return (
      <div className="phase-action-bar phase-action-bar--waiting">
        <span className="phase-action-bar__hint">Waiting for active player…</span>
      </div>
    )
  }

  if (game.phase === 'challenge' && claim) {
    const challengers = game.players.filter((player) => {
      if (player.id === claim.claimantId) return false
      if (claim.challengerId) return false
      if (challengerPlayerId && player.id !== challengerPlayerId) return false
      const board = game.boards[player.id]
      return (board?.coins ?? 0) >= CHALLENGE_COST
    })

    return (
      <div className="phase-action-bar phase-action-bar--challenge">
        {!claim.challengerId && challengers.length > 0 && (
          <div className="phase-action-bar__challenges">
            {challengers.map((player) => (
              <button
                key={player.id}
                type="button"
                className="btn btn-secondary"
                onClick={() => onChallenge?.(player.id)}
              >
                Challenge · {CHALLENGE_COST} coin
              </button>
            ))}
          </div>
        )}
        {claim.challengerId && (
          <span className="phase-action-bar__hint">
            Challenged by {game.players.find((p) => p.id === claim.challengerId)?.name}
          </span>
        )}
        <button type="button" className="btn btn-primary btn-lg" onClick={onReveal}>
          Reveal year
        </button>
      </div>
    )
  }

  if (game.phase === 'reveal') {
    const canAdvance = mode === 'local' || isHost
    return (
      <div className="phase-action-bar">
        {canAdvance ? (
          <button type="button" className="btn btn-primary btn-lg" onClick={onAdvance}>
            Next turn
          </button>
        ) : (
          <span className="phase-action-bar__hint">Waiting for host…</span>
        )}
      </div>
    )
  }

  return null
}
