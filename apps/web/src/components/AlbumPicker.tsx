import { useState } from 'react'
import type { Album, Song } from '@spot-the-song/game-engine'
import { createId } from '@spot-the-song/game-engine'
import { importSpotifyAlbum, isSpotifyImportAvailable } from '../lib/spotify'

type AlbumPickerProps = {
  ownerPlayerId: string
  albums: Album[]
  onChange: (albums: Album[]) => void
}

type DraftSong = {
  title: string
  artist: string
  audioUrl: string
}

const emptySong = (): DraftSong => ({
  title: '',
  artist: '',
  audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
})

export default function AlbumPicker({
  ownerPlayerId,
  albums,
  onChange,
}: AlbumPickerProps) {
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [albumName, setAlbumName] = useState('')
  const [draftSongs, setDraftSongs] = useState<DraftSong[]>([emptySong()])

  const spotifyEnabled = isSpotifyImportAvailable()

  function updateDraftSong(index: number, field: keyof DraftSong, value: string) {
    setDraftSongs((current) =>
      current.map((song, i) => (i === index ? { ...song, [field]: value } : song)),
    )
  }

  async function handleSpotifyImport() {
    if (!spotifyUrl.trim()) return

    setImporting(true)
    setImportMessage(null)

    try {
      const result = await importSpotifyAlbum(spotifyUrl, ownerPlayerId)
      onChange([...albums, result.album])
      setSpotifyUrl('')

      if (result.skippedCount > 0) {
        setImportMessage(
          `Added ${result.album.songs.length} songs. ${result.skippedCount} tracks had no preview and were skipped.`,
        )
      } else {
        setImportMessage(`Added ${result.album.songs.length} songs from ${result.album.name}.`)
      }
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : 'Spotify import failed')
    } finally {
      setImporting(false)
    }
  }

  function addManualAlbum() {
    const validSongs = draftSongs.filter((song) => song.title && song.artist)
    if (!albumName.trim() || validSongs.length === 0) return

    const songs: Song[] = validSongs.map((song) => ({
      id: createId('song'),
      title: song.title.trim(),
      artist: song.artist.trim(),
      album: albumName.trim(),
      audioUrl: song.audioUrl.trim(),
    }))

    const album: Album = {
      id: createId('album'),
      name: albumName.trim(),
      ownerPlayerId,
      songs,
    }

    onChange([...albums, album])
    setAlbumName('')
    setDraftSongs([emptySong()])
    setShowManual(false)
  }

  function removeAlbum(albumId: string) {
    onChange(albums.filter((album) => album.id !== albumId))
  }

  return (
    <div className="stack">
      <div className="row">
        {albums.map((album) => (
          <span key={album.id} className="album-chip">
            {album.name} ({album.songs.length})
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '2px 8px' }}
              onClick={() => removeAlbum(album.id)}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="card-panel stack">
        <h3 className="card-title">Import from Spotify</h3>
        <p className="muted">
          Paste a Spotify album or playlist link. Songs use Spotify&apos;s 30-second previews.
        </p>

        {!spotifyEnabled && (
          <p className="muted">
            Spotify import needs the online backend configured (Supabase + edge function).
          </p>
        )}

        <div className="inline-form">
          <input
            className="input"
            value={spotifyUrl}
            onChange={(event) => setSpotifyUrl(event.target.value)}
            placeholder="https://open.spotify.com/album/..."
            disabled={!spotifyEnabled || importing}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleSpotifyImport()}
            disabled={!spotifyEnabled || importing || !spotifyUrl.trim()}
          >
            {importing ? 'Importing…' : 'Import'}
          </button>
        </div>

        {importMessage && <p className="muted">{importMessage}</p>}
      </div>

      <div className="card-panel stack">
        <button
          type="button"
          className="btn btn-ghost"
          style={{ alignSelf: 'flex-start', padding: 0 }}
          onClick={() => setShowManual((current) => !current)}
        >
          {showManual ? 'Hide manual entry' : 'Add album manually instead'}
        </button>

        {showManual && (
          <>
            <div className="field">
              <label className="label" htmlFor="album-name">
                Album name
              </label>
              <input
                id="album-name"
                className="input"
                value={albumName}
                onChange={(event) => setAlbumName(event.target.value)}
                placeholder="e.g. Road Trip Mix"
              />
            </div>

            {draftSongs.map((song, index) => (
              <div key={index} className="song-row">
                <div className="field">
                  <label className="label">Title</label>
                  <input
                    className="input"
                    value={song.title}
                    onChange={(event) => updateDraftSong(index, 'title', event.target.value)}
                    placeholder="Song title"
                  />
                </div>
                <div className="field">
                  <label className="label">Artist</label>
                  <input
                    className="input"
                    value={song.artist}
                    onChange={(event) => updateDraftSong(index, 'artist', event.target.value)}
                    placeholder="Artist name"
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                    setDraftSongs((current) => current.filter((_, i) => i !== index))
                  }
                  disabled={draftSongs.length === 1}
                >
                  Remove
                </button>
              </div>
            ))}

            <div className="row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDraftSongs((current) => [...current, emptySong()])}
              >
                Add Song
              </button>
              <button type="button" className="btn btn-primary" onClick={addManualAlbum}>
                Save Album
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
