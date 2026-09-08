import { describe, expect, it } from 'vitest'
import { matchField, normalizeAnswer } from './matching.js'

describe('normalizeAnswer', () => {
  it('strips leading "the" and punctuation', () => {
    expect(normalizeAnswer('The Beatles!')).toBe('beatles')
  })
})

describe('matchField', () => {
  const track = {
    id: '1',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    album: 'A Night at the Opera',
    year: 1975,
  }

  it('matches title with minor formatting differences', () => {
    expect(matchField('title', 'bohemian rhapsody', track)).toBe(true)
  })

  it('matches artist variants', () => {
    expect(matchField('artist', 'Queen', track)).toBe(true)
  })

  it('matches album and year', () => {
    expect(matchField('album', 'Night at the Opera', track)).toBe(true)
    expect(matchField('year', '1975', track)).toBe(true)
  })

  it('rejects wrong answers', () => {
    expect(matchField('title', 'Stairway to Heaven', track)).toBe(false)
  })
})
