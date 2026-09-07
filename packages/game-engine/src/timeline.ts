export const STARTING_COINS = 3
export const CHALLENGE_COST = 1
export const GUESS_REWARD_COINS = 1

export function createEmptyTimeline(): string[] {
  return []
}

export function insertAtIndex(cards: string[], songId: string, insertIndex: number): string[] {
  const next = [...cards]
  const index = Math.max(0, Math.min(insertIndex, next.length))
  next.splice(index, 0, songId)
  return next
}

export function isPlacementCorrect(
  releaseYear: number,
  timeline: string[],
  insertIndex: number,
  getReleaseYear: (songId: string) => number | undefined,
): boolean {
  const index = Math.max(0, Math.min(insertIndex, timeline.length))
  const beforeYear = index > 0 ? getReleaseYear(timeline[index - 1]) : undefined
  const afterYear = index < timeline.length ? getReleaseYear(timeline[index]) : undefined

  if (beforeYear !== undefined && releaseYear < beforeYear) return false
  if (afterYear !== undefined && releaseYear > afterYear) return false
  return true
}

export function findCorrectInsertIndex(
  releaseYear: number,
  timeline: string[],
  getReleaseYear: (songId: string) => number | undefined,
): number {
  for (let index = 0; index <= timeline.length; index += 1) {
    if (isPlacementCorrect(releaseYear, timeline, index, getReleaseYear)) {
      return index
    }
  }
  return timeline.length
}

export function describeInsertPosition(insertIndex: number, timelineLength: number): string {
  if (timelineLength === 0) return 'on their timeline'
  if (insertIndex <= 0) return 'before their earliest card'
  if (insertIndex >= timelineLength) return 'after their latest card'
  return 'between their cards'
}
