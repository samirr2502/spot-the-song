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

    const onResult = (result: T) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      resolve(result)
    }

    // Must call socket.emit directly — extracting emit loses `this` and crashes in socket.io.
    if (payload === undefined) {
      socket.emit(event, onResult)
    } else {
      socket.emit(event, payload, onResult)
    }
  })
}
