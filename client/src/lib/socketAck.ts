import type { ActionResult } from '@spot-the-song/shared'
import type { Socket } from 'socket.io-client'

const DEFAULT_ACK_TIMEOUT_MS = 45_000

export function emitWithAck<T extends ActionResult>(
  socket: Socket,
  event: string,
  payload: unknown,
  timeoutMs = DEFAULT_ACK_TIMEOUT_MS,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false

    const timer = window.setTimeout(() => {
      if (settled) return
      settled = true
      reject(new Error('Server took too long to respond. Check your connection and try again.'))
    }, timeoutMs)

    const emit = payload === undefined
      ? (socket.emit as (event: string, callback: (result: T) => void) => void)
      : (socket.emit as (event: string, payload: unknown, callback: (result: T) => void) => void)

    const onResult = (result: T) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      resolve(result)
    }

    if (payload === undefined) {
      ;(emit as (event: string, callback: (result: T) => void) => void)(event, onResult)
    } else {
      ;(emit as (event: string, payload: unknown, callback: (result: T) => void) => void)(
        event,
        payload,
        onResult,
      )
    }
  })
}
