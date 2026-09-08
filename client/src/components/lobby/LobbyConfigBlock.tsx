type LobbyConfigBlockProps = {
  sectionLabel: string
  value: string
  subtitle?: string
  onEdit?: () => void
  canEdit?: boolean
}

export function LobbyConfigBlock({
  sectionLabel,
  value,
  subtitle,
  onEdit,
  canEdit = false,
}: LobbyConfigBlockProps) {
  return (
    <div className="lobby-config-block">
      <p className="lobby-config-block__section">{sectionLabel}</p>
      <div className="lobby-config-block__value">
        <span className="lobby-config-block__text">{value}</span>
        {canEdit && onEdit ? (
          <button
            type="button"
            className="lobby-config-block__edit"
            onClick={onEdit}
            aria-label={`Edit ${sectionLabel.toLowerCase()}`}
          >
            ✎
          </button>
        ) : null}
      </div>
      {subtitle ? <p className="lobby-config-block__subtitle">{subtitle}</p> : null}
    </div>
  )
}
