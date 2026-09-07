type FlipCardProps = {
  flipped: boolean
  albumName?: string
  title?: string
  artist?: string
}

export default function FlipCard({
  flipped,
  albumName,
  title,
  artist,
}: FlipCardProps) {
  return (
    <div className={`card-flip${flipped ? ' flipped' : ''}`}>
      <div className="card-flip-inner">
        <div className="card-face front">
          <span className="question-mark">?</span>
          {albumName && <span className="album-label">{albumName}</span>}
        </div>
        <div className="card-face back">
          <h3 className="song-title">{title}</h3>
          <p className="song-artist">{artist}</p>
        </div>
      </div>
    </div>
  )
}
