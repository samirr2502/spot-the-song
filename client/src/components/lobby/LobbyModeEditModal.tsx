import { useEffect, useState } from 'react'
import type { GameSettings, TurnGame } from '@spot-the-song/shared'
import { settingsForModeSelection, TURN_GAME_OPTIONS } from '../../lib/gameModeLabel'
import { SketchButton } from '../sketch'
import { SketchModal } from '../sketch/SketchModal'

type LobbyModeEditModalProps = {
  open: boolean
  currentSettings: GameSettings
  busy: boolean
  error: string | null
  onClose: () => void
  onSave: (settings: GameSettings) => void | Promise<void>
}

export function LobbyModeEditModal({
  open,
  currentSettings,
  busy,
  error,
  onClose,
  onSave,
}: LobbyModeEditModalProps) {
  const [playMode, setPlayMode] = useState<'all-in' | 'turns'>(currentSettings.playMode)
  const [turnGame, setTurnGame] = useState<TurnGame>(currentSettings.turnGame ?? 'guess')

  useEffect(() => {
    if (!open) return
    setPlayMode(currentSettings.playMode)
    setTurnGame(currentSettings.turnGame ?? 'guess')
  }, [open, currentSettings])

  async function handleSave() {
    const next = settingsForModeSelection(
      currentSettings,
      playMode,
      playMode === 'turns' ? turnGame : undefined,
    )
    await onSave(next)
  }

  return (
    <SketchModal open={open} title="Game mode" onClose={onClose}>
      <div className="lobby-tab-bar" role="tablist" aria-label="Play mode">
        <button
          type="button"
          role="tab"
          aria-selected={playMode === 'all-in'}
          className={`lobby-tab${playMode === 'all-in' ? ' lobby-tab--active' : ''}`}
          onClick={() => setPlayMode('all-in')}
        >
          All In
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={playMode === 'turns'}
          className={`lobby-tab${playMode === 'turns' ? ' lobby-tab--active' : ''}`}
          onClick={() => setPlayMode('turns')}
        >
          Turns
        </button>
      </div>

      {playMode === 'turns' ? (
        <div className="mode-list mode-list--compact">
          {TURN_GAME_OPTIONS.map((game) => {
            const active = turnGame === game.id
            return (
              <button
                key={game.id}
                type="button"
                className={`mode-option${active ? ' mode-option--active' : ''}`}
                onClick={() => setTurnGame(game.id)}
              >
                <span className="mode-option__title">{game.title}</span>
                <span className="mode-option__desc">{game.description}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <p className="lobby-modal-hint">Everyone guesses the same clip at once — fastest answers earn bonus points.</p>
      )}

      {error ? <p className="form-error">{error}</p> : null}

      <SketchButton fullWidth disabled={busy} onClick={() => void handleSave()}>
        {busy ? 'Saving…' : 'Save'}
      </SketchButton>
    </SketchModal>
  )
}
