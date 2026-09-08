export type MusicPreviewResult = {
  name: string
  imageUrl?: string
  totalTracks: number
  playableCount: number
  skippedCount: number
  source: 'spotify' | 'mock'
}

export async function previewMusicLink(url: string): Promise<MusicPreviewResult> {
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
