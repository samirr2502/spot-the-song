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
