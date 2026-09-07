import { describe, expect, it } from 'vitest'
import {
  advanceTurn,
  createGame,
  createId,
  getScoreboard,
  isTimerExpired,
  startGame,
  submitGuess,
} from './game.js'
import { isGuessCorrect, normalizeGuess } from './validation.js'
import type { Album, Song } from './types.js'

const demoSongs: Song[] = [
  {
    id: 'song_1',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    album: 'Divide',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: 'song_2',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    id: 'song_3',
    title: 'Levitating',
    artist: 'Dua Lipa',
    album: 'Future Nostalgia',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
]

function makeAlbums(): Album[] {
  return [
    {
      id: 'album_1',
      name: 'Pop Hits',
      ownerPlayerId: 'player_1',
      songs: demoSongs,
    },
  ]
}

describe('normalizeGuess', () => {
  it('normalizes casing and punctuation', () => {
    expect(normalizeGuess('  Shape of You! ')).toBe('shape of you')
    expect(normalizeGuess("Don't Stop")).toBe("don't stop")
  })
})

describe('isGuessCorrect', () => {
  it('accepts title or artist matches', () => {
    expect(isGuessCorrect('shape of you', 'Shape of You', 'Ed Sheeran')).toBe(true)
    expect(isGuessCorrect('ed sheeran', 'Shape of You', 'Ed Sheeran')).toBe(true)
    expect(isGuessCorrect('wrong answer', 'Shape of You', 'Ed Sheeran')).toBe(false)
  })
})

describe('game flow', () => {
  const players = [
    { id: 'player_1', name: 'Alice' },
    { id: 'player_2', name: 'Bob' },
  ]

  it('creates a lobby game with players and albums', () => {
    const game = createGame(players, makeAlbums())
    expect(game.phase).toBe('lobby')
    expect(game.players).toHaveLength(2)
    expect(game.albums[0].songs).toHaveLength(3)
  })

  it('starts with a shuffled deck and active turn', () => {
    const game = startGame(createGame(players, makeAlbums()))
    expect(game.phase).toBe('playing')
    expect(game.deck).toHaveLength(2)
    expect(game.currentTurn?.activePlayerId).toBe('player_1')
  })

  it('scores correct guesses and rotates players', () => {
    let game = startGame(createGame(players, makeAlbums()))
    const currentSongId = game.currentTurn!.currentSongId
    const song = makeAlbums()[0].songs.find((s) => s.id === currentSongId)!

    game = submitGuess(game, song.title)
    expect(game.phase).toBe('reveal')
    expect(game.currentTurn?.isCorrect).toBe(true)

    game = advanceTurn(game)
    expect(game.players.find((p) => p.id === 'player_1')?.score).toBe(1)
    expect(game.currentTurn?.activePlayerId).toBe('player_2')
  })

  it('ends when the deck is exhausted', () => {
    let game = startGame(createGame(players, makeAlbums()))
    for (let i = 0; i < 3; i += 1) {
      game = submitGuess(game, '')
      game = advanceTurn(game)
    }
    expect(game.phase).toBe('finished')
    expect(game.currentTurn).toBeNull()
  })

  it('detects timer expiry during playing phase', () => {
    const game = startGame(
      createGame(players, makeAlbums(), { guessTimeSeconds: 1 }),
    )
    const expired = {
      ...game,
      currentTurn: game.currentTurn
        ? {
            ...game.currentTurn,
            guessDeadline: Date.now() - 1000,
          }
        : null,
    }
    expect(isTimerExpired(expired)).toBe(true)
  })

  it('sorts scoreboard by score then fewer wrong guesses', () => {
    const game = createGame(players, makeAlbums())
    game.players = [
      { id: 'player_1', name: 'Alice', score: 2, order: 0 },
      { id: 'player_2', name: 'Bob', score: 2, order: 1 },
    ]
    game.turnHistory = [
      { playerId: 'player_1', songId: 'song_1', guess: 'x', isCorrect: false },
      { playerId: 'player_2', songId: 'song_2', guess: 'y', isCorrect: true },
    ]
    const board = getScoreboard(game)
    expect(board[0].id).toBe('player_2')
  })
})

describe('createId', () => {
  it('generates unique ids', () => {
    expect(createId('test')).not.toBe(createId('test'))
  })
})
