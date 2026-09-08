import { useEffect, useState } from 'react'

export function useCountdown(endsAt: number | null | undefined): number {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!endsAt) {
      setRemaining(0)
      return
    }

    const tick = () => {
      setRemaining(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)))
    }

    tick()
    const interval = window.setInterval(tick, 250)
    return () => window.clearInterval(interval)
  }, [endsAt])

  return remaining
}
