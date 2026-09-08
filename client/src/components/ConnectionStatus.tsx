import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useRoom } from '../context/RoomContext'
import { useSocketContext } from '../context/SocketContext'
import { SketchButton } from './sketch/SketchButton'
import { SketchModal } from './sketch/SketchModal'

export function ConnectionStatus() {
  const navigate = useNavigate()
  const location = useLocation()
  const { connectionState, healthOk } = useSocketContext()
  const { session, isHost, busy, closeRoom, returnToLobby } = useRoom()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const inRoom = Boolean(session && location.pathname.toLowerCase().startsWith('/room/'))
  const showExit = inRoom && isHost

  const socketLabel =
    connectionState === 'connected'
      ? 'Live'
      : connectionState === 'connecting'
        ? 'Connecting…'
        : connectionState === 'error'
          ? 'Offline'
          : 'Disconnected'

  const healthLabel = healthOk === null ? '…' : healthOk ? 'OK' : 'Down'

  async function handleConfirmClose() {
    const ok = await closeRoom()
    setConfirmOpen(false)
    if (ok) {
      navigate('/home', { replace: true })
    }
  }

  async function handleGoToLobby() {
    const ok = await returnToLobby()
    setConfirmOpen(false)
    if (ok && session) {
      navigate(`/room/${session.roomCode}`, { replace: true })
    }
  }

  return (
    <>
      <div className="connection-status" aria-live="polite">
        <div className="connection-status__main">
          <span className={`connection-dot connection-dot--${connectionState}`} aria-hidden />
          <span>
            Socket: {socketLabel} · API: {healthLabel}
          </span>
        </div>
        {showExit ? (
          <button
            type="button"
            className="connection-status__exit-link"
            disabled={busy}
            onClick={() => setConfirmOpen(true)}
          >
            Exit
          </button>
        ) : null}
      </div>

      <SketchModal
        open={confirmOpen}
        title="Exit game?"
        onClose={() => setConfirmOpen(false)}
      >
        <p className="connection-status__confirm-text">
          Go to lobby to end the current game and start fresh with the same players. Close room
          removes everyone from the room.
        </p>
        <div className="connection-status__confirm-actions">
          <SketchButton type="button" variant="ghost" fullWidth onClick={() => setConfirmOpen(false)}>
            Cancel
          </SketchButton>
          <SketchButton type="button" fullWidth disabled={busy} onClick={() => void handleGoToLobby()}>
            {busy ? 'Returning…' : 'Go to lobby'}
          </SketchButton>
          <SketchButton type="button" fullWidth disabled={busy} onClick={() => void handleConfirmClose()}>
            {busy ? 'Closing…' : 'Close room'}
          </SketchButton>
        </div>
      </SketchModal>
    </>
  )
}
