import { sketchTilt } from './sketchUtils'

type SketchAvatarProps = {
  name: string
  isHost?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function SketchAvatar({ name, isHost, size = 'md' }: SketchAvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  const tilt = sketchTilt(name, 2)

  return (
    <div
      className={`sketch-avatar sketch-avatar--${size}${isHost ? ' sketch-avatar--host' : ''}`}
      style={{ '--sketch-tilt': `${tilt}deg` } as React.CSSProperties}
      title={name}
      aria-label={isHost ? `${name}, host` : name}
    >
      <span className="sketch-avatar__initial">{initial}</span>
      {isHost ? <span className="sketch-avatar__crown" aria-hidden>★</span> : null}
    </div>
  )
}
