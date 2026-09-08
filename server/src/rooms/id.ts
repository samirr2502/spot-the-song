import { randomBytes } from 'node:crypto'

export function generateId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString('hex')}`
}

export function generateSessionToken(): string {
  return randomBytes(24).toString('hex')
}
