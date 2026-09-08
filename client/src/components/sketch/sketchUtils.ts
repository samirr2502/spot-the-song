/** Stable slight rotation from a string seed (for hand-drawn feel). */
export function sketchTilt(seed: string, maxDegrees = 1.2): number {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  const normalized = (hash % 1000) / 1000
  return (normalized * 2 - 1) * maxDegrees
}

export function sketchClass(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
