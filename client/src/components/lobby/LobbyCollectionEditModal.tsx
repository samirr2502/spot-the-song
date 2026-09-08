import { type FormEvent, useEffect, useState } from 'react'
import type { GameSettings } from '@spot-the-song/shared'
import { MusicImportPreviewCard } from '../MusicImportPreviewCard'
import { SketchButton, SketchInput } from '../sketch'
import { SketchModal } from '../sketch/SketchModal'
import { previewMusicLink, type MusicPreviewResult } from '../../lib/musicApi'

type LobbyCollectionEditModalProps = {
  open: boolean
  settings: GameSettings
  busy: boolean
  error: string | null
  onClose: () => void
  onSave: (spotifyUrl: string) => void | Promise<void>
}

export function LobbyCollectionEditModal({
  open,
  settings,
  busy,
  error,
  onClose,
  onSave,
}: LobbyCollectionEditModalProps) {
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [preview, setPreview] = useState<MusicPreviewResult | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const isTimeline = settings.playMode === 'turns' && settings.turnGame === 'timeline'

  useEffect(() => {
    if (!open) return
    setSpotifyUrl('')
    setLocalError(null)
    setPreview(null)
    setPreviewError(null)
  }, [open])

  async function handlePreview() {
    setPreviewError(null)
    setPreview(null)

    if (!spotifyUrl.trim()) {
      setPreviewError('Paste a Spotify playlist or album link first.')
      return
    }

    setPreviewLoading(true)

    try {
      const result = await previewMusicLink(spotifyUrl)
      setPreview(result)

      const minimumTracks = isTimeline
        ? settings.cardsToWin ?? settings.roundCount
        : settings.roundCount
      if (result.totalTracks < minimumTracks) {
        setPreviewError(
          isTimeline
            ? `Only ${result.totalTracks} tracks — need at least ${minimumTracks} for starter and earned cards.`
            : `Only ${result.totalTracks} tracks — lower rounds to ${settings.roundCount} or fewer.`,
        )
      }
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Could not load link')
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLocalError(null)

    const trimmedUrl = spotifyUrl.trim()
    if (!trimmedUrl) {
      setLocalError('Paste a Spotify link to change the collection.')
      return
    }

    if (!preview) {
      setLocalError('Check your Spotify link before saving.')
      return
    }

    await onSave(trimmedUrl)
  }

  const displayError = localError || error

  return (
    <SketchModal open={open} title="Music collection" onClose={onClose}>
      <form className="setup-form" onSubmit={(event) => void handleSubmit(event)}>
        <SketchInput
          label="Spotify playlist or album link"
          name="spotifyUrl"
          placeholder="https://open.spotify.com/playlist/…"
          value={spotifyUrl}
          onChange={(event) => {
            setSpotifyUrl(event.target.value)
            setPreview(null)
            setPreviewError(null)
          }}
          autoComplete="off"
        />

        <SketchButton
          type="button"
          variant="ghost"
          fullWidth
          disabled={previewLoading || busy || !spotifyUrl.trim()}
          onClick={() => void handlePreview()}
        >
          {previewLoading ? 'Loading…' : 'Check link'}
        </SketchButton>

        {preview ? <MusicImportPreviewCard preview={preview} tiltSeed="preview-lobby-edit" /> : null}
        {previewError ? <p className="form-error">{previewError}</p> : null}
        {displayError ? <p className="form-error">{displayError}</p> : null}

        <SketchButton type="submit" fullWidth disabled={busy || previewLoading || !preview}>
          {busy ? 'Saving…' : 'Save'}
        </SketchButton>
      </form>
    </SketchModal>
  )
}
