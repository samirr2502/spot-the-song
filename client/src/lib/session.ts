import type { RoomSessionPayload } from '@spot-the-song/shared'

export const PLAYER_NAME_KEY = 'sts-player-name'
export const ROOM_SESSION_KEY = 'sts-room-session'

export function getPlayerName(): string {
  return sessionStorage.getItem(PLAYER_NAME_KEY)?.trim() ?? ''
}

export function savePlayerName(name: string): void {
  sessionStorage.setItem(PLAYER_NAME_KEY, name.trim())
}

export function getRoomSession(): RoomSessionPayload | null {
  const raw = sessionStorage.getItem(ROOM_SESSION_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as RoomSessionPayload
    if (parsed.playerId && parsed.sessionToken && parsed.roomCode) {
      return parsed
    }
  } catch {
    // ignore invalid session
  }

  return null
}

export function saveRoomSession(session: RoomSessionPayload): void {
  sessionStorage.setItem(ROOM_SESSION_KEY, JSON.stringify(session))
}

export function clearRoomSession(): void {
  sessionStorage.removeItem(ROOM_SESSION_KEY)
}

export function buildJoinUrl(roomCode: string): string {
  const url = new URL('/join', window.location.origin)
  url.searchParams.set('code', roomCode)
  return url.toString()
}
