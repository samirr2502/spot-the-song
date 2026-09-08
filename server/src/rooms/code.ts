import { randomInt } from 'node:crypto'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6

export function generateRoomCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_CHARS[randomInt(CODE_CHARS.length)]!
  }
  return code
}

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function isValidRoomCode(code: string): boolean {
  return code.length === CODE_LENGTH && /^[A-Z0-9]+$/.test(code)
}
