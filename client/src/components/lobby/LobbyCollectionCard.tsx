import { SketchCard } from '../sketch'

type LobbyCollectionCardProps = {
  title: string
  subtitle?: string
  tiltSeed?: string
  onEdit?: () => void
  canEdit?: boolean
}

export function LobbyCollectionCard({
  title,
  subtitle,
  tiltSeed = 'collection',
  onEdit,
  canEdit = false,
}: LobbyCollectionCardProps) {
  return (
    <SketchCard className="lobby-collection-card" tiltSeed={tiltSeed}>
      <p className="lobby-collection-card__label">Music collection</p>
      <div className="lobby-collection-card__value">
        <span className="lobby-collection-card__title">{title}</span>
        {canEdit && onEdit ? (
          <button
            type="button"
            className="lobby-collection-card__edit"
            onClick={onEdit}
            aria-label="Edit music collection"
          >
            ✎
          </button>
        ) : null}
      </div>
      {subtitle ? <p className="lobby-collection-card__subtitle">{subtitle}</p> : null}
    </SketchCard>
  )
}
