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

  if (settings.clipDurationSeconds !== 15 && settings.clipDurationSeconds !== 30) {
    return 'Song clip must be 15 or 30 seconds.'
  }

  const guessTimer = settings.guessTimerSeconds ?? 0
  if (guessTimer < 0 || guessTimer > 120) {
    return 'Extra time after the clip must be between 0 and 120 seconds.'
  }

  return null
}

export function validateSingAlongSettings(settings: {
  roundCount: number
  singTimerSeconds?: number
}): string | null {
  if (settings.roundCount < 1 || settings.roundCount > 20) {
    return 'Choose between 1 and 20 rounds.'
  }

  const singTimer = settings.singTimerSeconds ?? 45
  if (![15, 30, 45, 60].includes(singTimer)) {
    return 'Performance time must be 15, 30, 45, or 60 seconds.'
  }

  return null
}

export function validateTimelineSettings(settings: {
  roundCount: number
  clipDurationSeconds: number
  guessTimerSeconds?: number
}): string | null {
  if (settings.roundCount < 1 || settings.roundCount > 20) {
    return 'Choose between 1 and 20 rounds.'
  }

  if (settings.clipDurationSeconds !== 15 && settings.clipDurationSeconds !== 30) {
    return 'Song clip must be 15 or 30 seconds.'
  }

  const guessTimer = settings.guessTimerSeconds ?? 0
  if (guessTimer < 0 || guessTimer > 120) {
    return 'Extra placement time must be between 0 and 120 seconds.'
  }

  return null
}
