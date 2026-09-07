export function normalizeGuess(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['']/g, "'")
    .replace(/[^\w\s']/g, '')
    .replace(/\s+/g, ' ')
}

export function isGuessCorrect(
  guess: string,
  title: string,
  artist: string,
): boolean {
  const normalized = normalizeGuess(guess)
  if (!normalized) return false

  const normalizedTitle = normalizeGuess(title)
  const normalizedArtist = normalizeGuess(artist)

  return normalized === normalizedTitle || normalized === normalizedArtist
}
