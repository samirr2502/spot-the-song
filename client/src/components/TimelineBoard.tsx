import type { TimelineCardPublic } from '@spot-the-song/shared'
import { SketchCard, SketchSongCard } from './sketch'

type TimelineBoardProps = {
  cards: TimelineCardPublic[]
  title: string
  interactive?: boolean
  selectedIndex?: number | null
  onSelectIndex?: (index: number) => void
  pendingCard?: {
    title?: string
    artist?: string
    album?: string
    hiddenYear?: boolean
  } | null
}

function TimelineCardFace({ card }: { card: TimelineCardPublic }) {
  if (card.revealed && card.title && card.artist && card.album && card.year !== undefined) {
    return (
      <SketchSongCard
        track={{
          title: card.title,
          artist: card.artist,
          album: card.album,
          year: card.year,
        }}
        compact
      />
    )
  }

  return (
    <SketchCard tiltSeed={card.trackId} className="timeline-card timeline-card--hidden">
      <p className="timeline-card__eyebrow">{card.isStarter ? 'starter' : 'hidden'}</p>
      <p className="timeline-card__title">???</p>
      <p className="timeline-card__year">????</p>
    </SketchCard>
  )
}

function InsertSlot({
  index,
  interactive,
  selected,
  onSelect,
}: {
  index: number
  interactive: boolean
  selected: boolean
  onSelect?: (index: number) => void
}) {
  if (!interactive) return null

  return (
    <button
      type="button"
      className={`timeline-insert-slot${selected ? ' timeline-insert-slot--selected' : ''}`}
      onClick={() => onSelect?.(index)}
      aria-label={`Insert at position ${index + 1}`}
    >
      {selected ? 'Here' : '+'}
    </button>
  )
}

export function TimelineBoard({
  cards,
  title,
  interactive = false,
  selectedIndex = null,
  onSelectIndex,
  pendingCard,
}: TimelineBoardProps) {
  return (
    <SketchCard tiltSeed="timeline-board" className="timeline-board">
      <h2 className="lobby-players__title">{title}</h2>

      {pendingCard && interactive ? (
        <div className="timeline-pending">
          <p className="page-eyebrow">incoming card</p>
          {pendingCard.title && pendingCard.artist ? (
            <SketchSongCard
              track={{
                title: pendingCard.title,
                artist: pendingCard.artist,
                album: pendingCard.album ?? '',
                year: 0,
              }}
              hiddenYear
              compact
            />
          ) : (
            <SketchCard tiltSeed="pending-hidden" className="timeline-card timeline-card--hidden">
              <p className="timeline-card__title">???</p>
              <p className="timeline-card__year">????</p>
            </SketchCard>
          )}
          <p className="timeline-pending__hint">Tap a slot below to place it</p>
        </div>
      ) : null}

      <div className="timeline-row">
        <InsertSlot
          index={0}
          interactive={interactive}
          selected={selectedIndex === 0}
          onSelect={onSelectIndex}
        />

        {cards.map((card, cardIndex) => (
          <div key={`${card.trackId}-${cardIndex}`} className="timeline-row-segment">
            <TimelineCardFace card={card} />
            <InsertSlot
              index={cardIndex + 1}
              interactive={interactive}
              selected={selectedIndex === cardIndex + 1}
              onSelect={onSelectIndex}
            />
          </div>
        ))}
      </div>

      {cards.length === 0 ? <p className="timeline-empty">No cards yet.</p> : null}
    </SketchCard>
  )
}
