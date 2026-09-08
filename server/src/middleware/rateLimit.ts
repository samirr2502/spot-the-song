import type { NextFunction, Request, Response } from 'express'

type RateLimitOptions = {
  windowMs: number
  max: number
}

type HitRecord = {
  count: number
  resetAt: number
}

export function createRateLimiter(options: RateLimitOptions) {
  const hits = new Map<string, HitRecord>()

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || req.socket.remoteAddress || 'unknown'
    const now = Date.now()

    let record = hits.get(key)
    if (!record || now >= record.resetAt) {
      record = { count: 0, resetAt: now + options.windowMs }
      hits.set(key, record)
    }

    record.count += 1

    if (record.count > options.max) {
      const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000)
      res.setHeader('Retry-After', String(retryAfterSeconds))
      res.status(429).json({ error: 'Too many requests. Try again later.' })
      return
    }

    next()
  }
}
