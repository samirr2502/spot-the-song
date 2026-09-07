import type { GameState } from '@spot-the-song/game-engine'
import { getSongById } from '@spot-the-song/game-engine'
import SongCard, { type SongCardFaceMode } from './SongCard'

const MAX_VISIBLE = 4

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
  const visibleIds = songIds.slice(-MAX_VISIBLE)
  const hiddenCount = Math.max(0, songIds.length - MAX_VISIBLE)

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

      {songIds.length === 0 ? (
        <div className="card-pile-empty muted">{emptyLabel}</div>
      ) : (
        <div className={`card-pile-stack card-pile-stack--${size}`}>
          {visibleIds.map((songId, index) => {
            const song = getSongById(game, songId)
            if (!song) return null

            return (
              <div
                key={songId}
                className="card-pile-stack__layer"
                style={{ zIndex: index + 1, transform: `translateX(${index * 10}px)` }}
              >
                <SongCard
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
              </div>
            )
          })}
          {hiddenCount > 0 && (
            <span className="card-pile-more muted">+{hiddenCount}</span>
          )}
        </div>
      )}
    </div>
  )
}
