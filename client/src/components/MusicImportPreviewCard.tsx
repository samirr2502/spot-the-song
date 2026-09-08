import type { MusicPreviewResult } from '../lib/musicApi'
import { SketchCard } from './sketch'

type MusicImportPreviewCardProps = {
  preview: MusicPreviewResult
  tiltSeed: string
}

export function MusicImportPreviewCard({ preview, tiltSeed }: MusicImportPreviewCardProps) {
  const previewCount = preview.previewFallbackCount ?? 0

  return (
    <SketchCard tiltSeed={tiltSeed} className="music-preview">
      <p className="music-preview__name">{preview.name}</p>
      <p className="music-preview__meta">
        {preview.totalTracks} tracks · {previewCount} with preview clips
        {preview.skippedCount > 0 ? ` · ${preview.skippedCount} skipped` : ''}
      </p>
      <p className="music-preview__source">
        {preview.source === 'spotify' ? 'Spotify' : 'Demo playlist'}
      </p>
    </SketchCard>
  )
}
