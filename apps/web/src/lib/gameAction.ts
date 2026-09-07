import { supabase } from './supabase'

export type GameActionType =
  | 'guess'
  | 'placement'
  | 'challenge'
  | 'reveal'
  | 'advance'

type GameActionPayload = {
  turnId?: string
  guess?: string
  insertIndex?: number
  challengerId?: string
}

export function isEdgeFunctionUnavailable(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error)

  const lower = message.toLowerCase()
  return (
    lower.includes('failed to send a request to the edge function') ||
    lower.includes('edge function') ||
    lower.includes('function not found') ||
    lower.includes('404') ||
    lower.includes('failed to fetch') ||
    lower.includes('network')
  )
}

export async function callGameAction(
  action: GameActionType,
  roomId: string,
  playerId: string,
  payload: GameActionPayload = {},
) {
  if (!supabase) throw new Error('Supabase is not configured')

  const { data, error } = await supabase.functions.invoke('game-action', {
    body: { action, roomId, playerId, payload },
  })

  if (error) {
    throw new Error(error.message || `Game action "${action}" failed`)
  }

  if (data?.error) {
    throw new Error(data.error as string)
  }

  return data
}

export async function callGameActionWithFallback(
  action: GameActionType,
  roomId: string,
  playerId: string,
  payload: GameActionPayload,
  fallback: () => Promise<void>,
) {
  try {
    await callGameAction(action, roomId, playerId, payload)
  } catch (error) {
    if (isEdgeFunctionUnavailable(error)) {
      await fallback()
      return
    }
    throw error
  }
}
