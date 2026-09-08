import type { GuessFields } from '../types/game.js'

export function hasAtLeastOneGuessField(fields: GuessFields): boolean {
  return fields.title || fields.artist || fields.album || fields.year
}

export function validateGameSettings(settings: {
  playMode?: 'all-in' | 'turns'
  guessFields: GuessFields
  roundCount: number
  clipDurationSeconds: number
  guessTimerSeconds?: number
}): string | null {
  if (!hasAtLeastOneGuessField(settings.guessFields)) {
    return 'Select at least one field to guess.'
  }

  if (settings.roundCount < 1 || settings.roundCount > 20) {
    return 'Choose between 1 and 20 rounds.'
  }

  if (settings.clipDurationSeconds < 5 || settings.clipDurationSeconds > 60) {
    return 'Clip duration must be between 5 and 60 seconds.'
  }

  const guessTimer = settings.guessTimerSeconds ?? 30
  if (guessTimer < 10 || guessTimer > 120) {
    return 'Answer time must be between 10 and 120 seconds.'
  }

  return null
}
