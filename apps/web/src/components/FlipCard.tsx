import SongCard from './SongCard'

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
    <SongCard
      size="hero"
      flipped={flipped}
      albumName={albumName}
      title={title}
      artist={artist}
    />
  )
}
