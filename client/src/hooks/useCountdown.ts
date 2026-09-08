import { useEffect, useState } from 'react'

export function useCountdown(endsAt: number | null | undefined): number {
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!endsAt) return

    const interval = window.setInterval(() => setTick((tick) => tick + 1), 250)
    return () => window.clearInterval(interval)
  }, [endsAt])

  if (!endsAt) return 0
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
}
