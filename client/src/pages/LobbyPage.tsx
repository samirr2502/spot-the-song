import { QRCodeSVG } from 'qrcode.react'
import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { SketchAvatar, SketchButton, SketchCard, SketchDivider } from '../components/sketch'
import { useRoom } from '../context/RoomContext'
import { buildJoinUrl } from '../lib/session'
import { roomPathForStatus } from '../hooks/useRoomNavigation'

export function LobbyPage() {
  const navigate = useNavigate()
  const { code = '' } = useParams()
  const { room, session, isHost, error, busy, startGame, leaveRoom, clearError } = useRoom()

  const normalizedCode = code.toUpperCase()
  const joinUrl = buildJoinUrl(normalizedCode)
  const inCorrectRoom = room?.code === normalizedCode && session?.roomCode === normalizedCode

  useEffect(() => {
    if (!room || room.code !== normalizedCode) return
    if (room.status !== 'lobby') {
      navigate(roomPathForStatus(room.code, room.status), { replace: true })
    }
  }, [room, normalizedCode, navigate])

  async function handleStart() {
    clearError()
    const ok = await startGame()
    if (ok) {
      navigate(`/room/${normalizedCode}/how-to-play`)
    }
  }

  async function handleLeave() {
    await leaveRoom()
    navigate('/home')
  }

  if (!inCorrectRoom) {
    return (
      <main className="page">
        <SketchCard tiltSeed="waiting">
          <h1 className="page-title page-title--sm">Connecting to lobby…</h1>
          <p className="page-subtitle">
            {session?.roomCode === normalizedCode
              ? 'Restoring your session…'
              : 'Join this room from the join screen if you have not yet.'}
          </p>
        </SketchCard>
        {session?.roomCode !== normalizedCode ? (
          <Link to={`/join?code=${normalizedCode}`}>
            <SketchButton fullWidth>Join {normalizedCode}</SketchButton>
          </Link>
        ) : null}
      </main>
    )
  }

  return (
    <main className="page page--lobby">
      <header className="page-header">
        <p className="page-eyebrow">lobby</p>
        <h1 className="page-title page-title--sm">Room {room.code}</h1>
        <p className="page-subtitle">
          {room.settings.playMode === 'all-in' ? 'All In mode' : 'Turns mode'} · waiting for host
        </p>
      </header>

      <SketchCard className="lobby-code-card" tiltSeed={room.code}>
        <p className="lobby-code-card__label">Room code</p>
        <p className="lobby-code-card__code">{room.code}</p>
        <div className="lobby-code-card__qr" aria-label={`QR code to join room ${room.code}`}>
          <QRCodeSVG value={joinUrl} size={168} bgColor="transparent" fgColor="#2d2d2d" level="M" />
        </div>
        <p className="lobby-code-card__hint">Friends can scan or enter the code</p>
      </SketchCard>

      <section className="lobby-players" aria-label="Players in lobby">
        <h2 className="lobby-players__title">Players ({room.players.length})</h2>
        <ul className="lobby-players__list">
          {room.players.map((player) => (
            <li key={player.id} className="lobby-players__item">
              <SketchAvatar name={player.name} isHost={player.isHost} />
              <div className="lobby-players__meta">
                <span className="lobby-players__name">
                  {player.name}
                  {player.id === session?.playerId ? ' (you)' : ''}
                </span>
                <span className="lobby-players__status">
                  {player.isHost ? 'host · ' : ''}
                  {player.connected ? 'online' : 'reconnecting…'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      {isHost ? (
        <SketchButton fullWidth disabled={busy} onClick={handleStart}>
          {busy ? 'Starting…' : 'Start game'}
        </SketchButton>
      ) : (
        <SketchCard tiltSeed="wait" className="lobby-wait-card">
          <p>Waiting for the host to start…</p>
        </SketchCard>
      )}

      <SketchDivider />

      <SketchButton variant="ghost" fullWidth disabled={busy} onClick={handleLeave}>
        Leave lobby
      </SketchButton>
    </main>
  )
}
