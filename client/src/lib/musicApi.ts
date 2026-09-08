import { getSpotifyCatalogUrlError } from '@spot-the-song/shared'

export type MusicPreviewResult = {
  name: string
  imageUrl?: string
  totalTracks: number
  playableCount: number
  skippedCount: number
  source: 'spotify' | 'mock'
  previewFallbackCount?: number
}

export async function previewMusicLink(url: string): Promise<MusicPreviewResult> {
  const trimmed = url.trim()
  if (trimmed) {
    const validationError = getSpotifyCatalogUrlError(trimmed)
    if (validationError) {
      throw new Error(validationError)
    }
  }

  const response = await fetch('/api/music/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: url.trim() }),
  })

  const data = (await response.json()) as MusicPreviewResult & { error?: string }

  if (!response.ok) {
    throw new Error(data.error || 'Could not load this link')
  }

  return data
}
