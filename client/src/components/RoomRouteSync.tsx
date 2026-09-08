import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useRoom } from '../context/RoomContext'
import { roomPathForStatus } from '../hooks/useRoomNavigation'

export function RoomRouteSync() {
  const navigate = useNavigate()
  const location = useLocation()
  const { room, session } = useRoom()

  useEffect(() => {
    if (!room || !session || session.roomCode !== room.code) return

    if (!location.pathname.startsWith('/room/')) {
      navigate(roomPathForStatus(room.code, room.status), { replace: true })
      return
    }

    const expectedPath = roomPathForStatus(room.code, room.status)
    const currentPath = location.pathname.toUpperCase()

    if (currentPath === expectedPath) return

    const onLobbyRoot = currentPath === `/ROOM/${room.code}`
    if (onLobbyRoot && room.status !== 'lobby') {
      navigate(expectedPath, { replace: true })
    }
  }, [room, session, location.pathname, navigate])

  return null
}
