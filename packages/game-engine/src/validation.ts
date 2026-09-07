import levenshtein from 'fast-levenshtein'

export function normalizeGuess(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['']/g, "'")
    .replace(/[^\w\s']/g, '')
    .replace(/\s+/g, ' ')
}

export type AcceptableAnswerExtras = {
  alternateTitles?: string[]
  alternateArtists?: string[]
}

function addAnswer(answers: Set<string>, value: string): void {
  const normalized = normalizeGuess(value)
  if (normalized) {
    answers.add(normalized)
  }
}

function stripParentheticals(value: string): string {
  return value
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .trim()
}

function stripRemasterSuffix(value: string): string {
  return value.replace(/\s*-\s*Remaster(ed)?(\s+\d{4})?$/i, '').trim()
}

function stripFeatSuffix(value: string): string {
  return value.replace(/\s+(feat\.?|ft\.?)\s+.+/i, '').trim()
}

function splitCollaborators(artist: string): string[] {
  return artist
    .split(/\s*&\s*|\s*,\s*|\s+x\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function artistVariants(artist: string): string[] {
  const variants = [artist]

  if (/^the\s/i.test(artist)) {
    variants.push(artist.replace(/^the\s/i, ''))
  }

  for (const part of splitCollaborators(artist)) {
    variants.push(part)
    if (/^the\s/i.test(part)) {
      variants.push(part.replace(/^the\s/i, ''))
    }
  }

  return variants
}

function titleVariants(title: string): string[] {
  const variants = [title]
  const noParen = stripParentheticals(title)
  if (noParen && noParen !== title) {
    variants.push(noParen)
  }

  const base = noParen || title
  const noRemaster = stripRemasterSuffix(base)
  if (noRemaster && noRemaster !== base) {
    variants.push(noRemaster)
  }

  const featBase = noRemaster || base
  const noFeat = stripFeatSuffix(featBase)
  if (noFeat && noFeat !== featBase) {
    variants.push(noFeat)
  }

  return variants
}

export function buildAcceptableAnswers(
  title: string,
  artist: string,
  extras?: AcceptableAnswerExtras,
): string[] {
  const answers = new Set<string>()

  for (const variant of titleVariants(title)) {
    addAnswer(answers, variant)
  }

  for (const variant of artistVariants(artist)) {
    addAnswer(answers, variant)
  }

  for (const alt of extras?.alternateTitles ?? []) {
    addAnswer(answers, alt)
  }

  for (const alt of extras?.alternateArtists ?? []) {
    for (const variant of artistVariants(alt)) {
      addAnswer(answers, variant)
    }
  }

  return Array.from(answers)
}

export function isFuzzyMatch(guess: string, target: string): boolean {
  if (!guess || !target) return false
  if (guess === target) return true
  if (guess.length < 3) return false

  const maxLen = Math.max(guess.length, target.length)
  const distance = levenshtein.get(guess, target)
  const similarity = 1 - distance / maxLen

  if (maxLen <= 5) {
    return distance <= 1
  }

  if (maxLen <= 10) {
    return distance <= 2 || similarity >= 0.85
  }

  return similarity >= 0.88
}

export function isGuessCorrect(
  guess: string,
  title: string,
  artist: string,
  extras?: AcceptableAnswerExtras,
): boolean {
  const normalized = normalizeGuess(guess)
  if (!normalized) return false

  const acceptableAnswers = buildAcceptableAnswers(title, artist, extras)
  return acceptableAnswers.some((answer) => isFuzzyMatch(normalized, answer))
}
