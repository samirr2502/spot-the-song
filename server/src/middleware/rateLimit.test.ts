import { describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'
import { createRateLimiter } from './rateLimit.js'

function mockReq(ip = '1.2.3.4'): Request {
  return {
    ip,
    socket: { remoteAddress: ip },
  } as Request
}

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code
      return res
    },
    json(payload: unknown) {
      res.body = payload
      return res
    },
    setHeader(name: string, value: string) {
      res.headers[name] = value
    },
  }
  return res as Response & {
    statusCode: number
    headers: Record<string, string>
    body: unknown
  }
}

describe('createRateLimiter', () => {
  it('allows requests up to the limit, then returns 429', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 })
    const next = vi.fn() as NextFunction

    limiter(mockReq(), mockRes(), next)
    limiter(mockReq(), mockRes(), next)
    expect(next).toHaveBeenCalledTimes(2)

    const blocked = mockRes()
    limiter(mockReq(), blocked, next)
    expect(blocked.statusCode).toBe(429)
    expect(blocked.body).toEqual({ error: 'Too many requests. Try again later.' })
    expect(next).toHaveBeenCalledTimes(2)
  })
})
