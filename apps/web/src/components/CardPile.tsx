import type { GameState } from '@spot-the-song/game-engine'
import { getSongById } from '@spot-the-song/game-engine'
import SongCard, { type SongCardFaceMode } from './SongCard'

type CardPileProps = {
  title: string
  songIds: string[]
  game: GameState
  emptyLabel?: string
  size?: 'hero' | 'timeline'
  highlightSongId?: string | null
  dropZone?: 'deck' | 'discard'
  isDropTarget?: boolean
  faceMode?: SongCardFaceMode
}

export default function CardPile({
  title,
  songIds,
  game,
  emptyLabel = 'Empty',
  size = 'timeline',
  highlightSongId = null,
  dropZone,
  isDropTarget = false,
  faceMode = 'title',
}: CardPileProps) {
  return (
    <div
      className={[
        'card-pile',
        dropZone ? 'card-drop-zone' : '',
        isDropTarget ? 'card-drop-zone--active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-drop-zone={dropZone}
    >
      <div className="card-pile-header">
        <span className="card-pile-title">{title}</span>
        <span className="card-pile-count">{songIds.length}</span>
      </div>
      <div className={`card-pile-row card-pile-row--${size}`}>
        {songIds.length === 0 ? (
          <div className="card-pile-empty muted">{emptyLabel}</div>
        ) : (
          songIds.map((songId) => {
            const song = getSongById(game, songId)
            if (!song) return null

            return (
              <SongCard
                key={songId}
                size={size}
                alwaysOpen
                faceMode={faceMode}
                title={song.title}
                artist={song.artist}
                showYear={song.releaseYear}
                className={
                  highlightSongId === songId ? 'song-card--highlight' : undefined
                }
              />
            )
          })
        )}
      </div>
    </div>
  )
}
