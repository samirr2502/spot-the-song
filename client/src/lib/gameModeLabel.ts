import type { GameSettings, GuessFields, TurnGame } from '@spot-the-song/shared'

export function getGameModeLabel(settings: GameSettings): string {
  if (settings.playMode === 'all-in') return 'All In'
  switch (settings.turnGame) {
    case 'guess':
      return 'Turn Guess'
    case 'sing':
      return 'Sing Along'
    case 'timeline':
      return 'Timeline'
    default:
      return 'Turns'
  }
}

export function getCollectionLabel(room: {
  playlistName?: string
  trackPoolSize?: number
  musicSource?: string
}): string {
  const name = room.playlistName ?? 'Spotify playlist'
  return name
}

export function getCollectionSubtitle(trackPoolSize?: number): string | undefined {
  if (!trackPoolSize) return undefined
  return `${trackPoolSize} track${trackPoolSize === 1 ? '' : 's'}`
}

function formatGuessFields(guessFields: GuessFields): string {
  const entries: Array<[keyof GuessFields, string]> = [
    ['title', 'Title'],
    ['artist', 'Artist'],
    ['album', 'Album'],
    ['year', 'Year'],
  ]
  return entries.filter(([field]) => guessFields[field]).map(([, label]) => label).join(', ')
}

export function getGameSettingsSummary(settings: GameSettings): string {
  const rounds = `${settings.roundCount} round${settings.roundCount === 1 ? '' : 's'}`

  if (settings.playMode === 'turns' && settings.turnGame === 'sing') {
    const singTimer = settings.singTimerSeconds ?? 45
    return `${rounds} · ${singTimer}s performance`
  }

  const clip = `${settings.clipDurationSeconds}s clip`
  const extra = settings.guessTimerSeconds ?? 0
  const extraLabel =
    settings.playMode === 'turns' && settings.turnGame === 'timeline'
      ? extra > 0
        ? ` · +${extra}s place`
        : ''
      : settings.playMode === 'turns' && settings.turnGame === 'guess'
        ? extra > 0
          ? ` · +${extra}s guess`
          : ''
        : extra > 0
          ? ` · +${extra}s answer`
          : ''

  if (settings.playMode === 'turns' && settings.turnGame === 'timeline') {
    const bonus = formatGuessFields(settings.guessFields)
    return bonus ? `${rounds} · ${clip}${extraLabel} · ${bonus} bonus` : `${rounds} · ${clip}${extraLabel}`
  }

  const fields = formatGuessFields(settings.guessFields)
  return fields ? `${rounds} · ${clip}${extraLabel} · ${fields}` : `${rounds} · ${clip}${extraLabel}`
}

export const TURN_GAME_OPTIONS: Array<{ id: TurnGame; title: string; description: string }> = [
  {
    id: 'guess',
    title: 'Guess',
    description: 'One player guesses aloud — everyone else votes.',
  },
  {
    id: 'sing',
    title: 'Sing Along',
    description: 'Perform a mystery song — audience rates you.',
  },
  {
    id: 'timeline',
    title: 'Timeline',
    description: 'Place songs in chronological order.',
  },
]

export function settingsForModeSelection(
  current: GameSettings,
  playMode: 'all-in' | 'turns',
  turnGame?: TurnGame,
): GameSettings {
  if (playMode === 'all-in') {
    const { turnGame, ...rest } = current
    void turnGame
    return { ...rest, playMode: 'all-in' }
  }

  return {
    ...current,
    playMode: 'turns',
    turnGame: turnGame ?? current.turnGame ?? 'guess',
  }
}
