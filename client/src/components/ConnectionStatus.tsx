import { useSocketContext } from '../context/SocketContext'

export function ConnectionStatus() {
  const { connectionState, healthOk } = useSocketContext()

  const socketLabel =
    connectionState === 'connected'
      ? 'Live'
      : connectionState === 'connecting'
        ? 'Connecting…'
        : connectionState === 'error'
          ? 'Offline'
          : 'Disconnected'

  const healthLabel =
    healthOk === null ? '…' : healthOk ? 'OK' : 'Down'

  return (
    <div className="connection-status" aria-live="polite">
      <span className={`connection-dot connection-dot--${connectionState}`} aria-hidden />
      <span>
        Socket: {socketLabel} · API: {healthLabel}
      </span>
    </div>
  )
}
