import type { PointerEvent as ReactPointerEvent } from 'react'
import type { GameState } from '@spot-the-song/game-engine'
import { getSongById } from '@spot-the-song/game-engine'
import type { RevealStage } from '../hooks/useRevealSequence'
import SongCard, {
  getActiveCardFaceMode,
  type SongCardFaceMode,
} from './SongCard'

type DrawStackProps = {
  game: GameState
  deckSongIds: string[]
  topSongId: string | null
  faceMode: SongCardFaceMode
  revealStage?: RevealStage
  draggable?: boolean
  dragging?: boolean
  isDropTarget?: boolean
  onTopDragStart?: (event: ReactPointerEvent<HTMLDivElement>) => void
}

const MAX_VISIBLE_LAYERS = 6

export default function DrawStack({
  game,
  deckSongIds,
  topSongId,
  faceMode,
  revealStage,
  draggable = false,
  dragging = false,
  isDropTarget = false,
  onTopDragStart,
}: DrawStackProps) {
  const topSong = topSongId ? getSongById(game, topSongId) : undefined
  const underCards = [...deckSongIds].reverse().slice(0, MAX_VISIBLE_LAYERS - 1)
  const totalCount = deckSongIds.length + (topSongId ? 1 : 0)

  return (
    <div
      className={[
        'draw-stack',
        'card-drop-zone',
        isDropTarget ? 'card-drop-zone--active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-drop-zone="deck"
    >
      <div className="draw-stack-header">
        <span className="draw-stack-title">Draw pile</span>
        <span className="draw-stack-count">{totalCount}</span>
      </div>

      <div className="draw-stack-body">
        {totalCount === 0 ? (
          <div className="draw-stack-empty muted">All drawn</div>
        ) : (
          <div className="draw-stack-pile">
            {underCards.map((songId, index) => (
              <div
                key={songId}
                className="draw-stack-layer"
                style={{
                  transform: `translate(${index * 2}px, ${index * 3}px)`,
                  zIndex: index,
                }}
              >
                <SongCard size="hero" faceMode="hidden" stackLayer alwaysOpen />
              </div>
            ))}

            {topSong && (
              <div
                className="draw-stack-top"
                style={{
                  transform: `translate(${underCards.length * 2}px, ${underCards.length * 3}px)`,
                  zIndex: underCards.length + 1,
                }}
              >
                <SongCard
                  size="hero"
                  faceMode={faceMode}
                  revealStage={revealStage}
                  alwaysOpen
                  title={topSong.title}
                  artist={topSong.artist}
                  showYear={topSong.releaseYear}
                  albumName={topSong.album}
                  draggable={draggable}
                  dragging={dragging}
                  onPointerDown={onTopDragStart}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export { getActiveCardFaceMode }
