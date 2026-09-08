export function getClientOrigin(): string {
  return process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5173'
}

export function isAllowedClientOrigin(
  origin: string | undefined,
  clientOrigin: string,
): boolean {
  if (!origin) return true
  if (origin === clientOrigin) return true

  if (process.env.NODE_ENV === 'production') return false

  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
}

export function corsOriginCallback(clientOrigin: string) {
  return (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    if (isAllowedClientOrigin(origin, clientOrigin)) {
      callback(null, true)
      return
    }
    callback(new Error(`Origin ${origin ?? 'unknown'} not allowed by CORS`))
  }
}
