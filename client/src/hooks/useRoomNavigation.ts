import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { GameRoom } from '@spot-the-song/shared'
import { useRoom } from '../context/RoomContext'

export function roomPathForStatus(code: string, status: GameRoom['status']): string {
  const base = `/room/${code.toUpperCase()}`
  switch (status) {
    case 'lobby':
      return base
    case 'how-to-play':
      return `${base}/how-to-play`
    case 'playing':
    case 'round-results':
      return `${base}/play`
    case 'final-results':
      return `${base}/results`
    default:
      return base
  }
}

export function useRoomStatusRedirect(expectedCode: string, allowedStatuses: GameRoom['status'][]) {
  const navigate = useNavigate()
  const { room, session } = useRoom()
  const normalizedCode = expectedCode.toUpperCase()

  useEffect(() => {
    if (!room || room.code !== normalizedCode || session?.roomCode !== normalizedCode) return

    if (!allowedStatuses.includes(room.status)) {
      navigate(roomPathForStatus(room.code, room.status), { replace: true })
    }
  }, [room, session, normalizedCode, allowedStatuses, navigate])
}
