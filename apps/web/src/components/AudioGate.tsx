type AudioGateProps = {
  unlocked: boolean
  onUnlock: () => void
}

export default function AudioGate({ unlocked, onUnlock }: AudioGateProps) {
  if (unlocked) return null

  return (
    <div className="audio-gate">
      <p>Tap to enable sound before the game starts.</p>
      <button type="button" className="btn btn-primary btn-lg" onClick={onUnlock}>
        Enable Audio
      </button>
    </div>
  )
}
