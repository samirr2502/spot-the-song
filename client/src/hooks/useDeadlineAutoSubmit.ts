import { useEffect, useRef } from 'react'

type UseDeadlineAutoSubmitOptions = {
  enabled: boolean
  endsAt: number | null | undefined
  secondsRemaining: number
  alreadyDone: boolean
  /** Submit when remaining seconds are at or below this value (default 0). */
  triggerAtOrBelow?: number
  onAutoSubmit: () => void | Promise<void>
}

/** Fire once when the countdown hits zero — used to flush in-progress form input. */
export function useDeadlineAutoSubmit({
  enabled,
  endsAt,
  secondsRemaining,
  alreadyDone,
  triggerAtOrBelow = 0,
  onAutoSubmit,
}: UseDeadlineAutoSubmitOptions): void {
  const attemptedRef = useRef(false)

  useEffect(() => {
    attemptedRef.current = false
  }, [endsAt, enabled])

  useEffect(() => {
    if (!enabled || alreadyDone || attemptedRef.current) return
    if (!endsAt || secondsRemaining > triggerAtOrBelow) return

    attemptedRef.current = true
    void onAutoSubmit()
  }, [enabled, alreadyDone, endsAt, secondsRemaining, triggerAtOrBelow, onAutoSubmit])
}
