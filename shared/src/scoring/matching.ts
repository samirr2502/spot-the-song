import levenshtein from 'fast-levenshtein'

export function normalizeAnswer(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/^the\s+/, '')
    .replace(/['']/g, "'")
    .replace(/[^\w\s']/g, '')
    .replace(/\s+/g, ' ')
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
    .split(/\s*&\s*|\s*,\s*|\s+x\s+/i)
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

function addAnswer(answers: Set<string>, value: string): void {
  const normalized = normalizeAnswer(value)
  if (normalized) {
    answers.add(normalized)
  }
}

export function buildAcceptableAnswers(title: string, artist: string, album: string): string[] {
  const answers = new Set<string>()

  for (const variant of titleVariants(title)) {
    addAnswer(answers, variant)
  }

  for (const variant of artistVariants(artist)) {
    addAnswer(answers, variant)
  }

  addAnswer(answers, album)
  const albumNoThe = album.replace(/^the\s/i, '')
  if (albumNoThe !== album) {
    addAnswer(answers, albumNoThe)
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

export function isYearMatch(guess: string, year: number): boolean {
  const digits = guess.replace(/\D/g, '')
  if (!digits) return false
  const parsed = Number.parseInt(digits.slice(0, 4), 10)
  return parsed === year
}

export function matchField(
  field: 'title' | 'artist' | 'album' | 'year',
  guess: string,
  track: { title: string; artist: string; album: string; year: number },
): boolean {
  const trimmed = guess.trim()
  if (!trimmed) return false

  if (field === 'year') {
    return isYearMatch(trimmed, track.year)
  }

  const normalized = normalizeAnswer(trimmed)
  if (!normalized) return false

  const targets =
    field === 'title'
      ? titleVariants(track.title).map(normalizeAnswer)
      : field === 'artist'
        ? artistVariants(track.artist).map(normalizeAnswer)
        : [normalizeAnswer(track.album), normalizeAnswer(track.album.replace(/^the\s/i, ''))]

  return targets.filter(Boolean).some((target) => isFuzzyMatch(normalized, target))
}
