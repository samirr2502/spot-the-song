import { describe, expect, it } from 'vitest'
import {
  advanceTurn,
  countVisibleCards,
  createGame,
  createId,
  getAllSongsInAlbum,
  getScoreboard,
  getSongById,
  isTimerExpired,
  revealClaim,
  startGame,
  submitChallenge,
  submitGuess,
  submitPlacement,
} from './game.js'
import { buildAcceptableAnswers, isGuessCorrect, normalizeGuess } from './validation.js'
import {
  findCorrectInsertIndex,
  GUESS_REWARD_COINS,
  insertAtIndex,
  isPlacementCorrect,
  STARTING_COINS,
} from './timeline.js'
import type { Album, Song } from './types.js'

const demoSongs: Song[] = [
  {
    id: 'song_1',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    album: 'Divide',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    releaseYear: 2017,
  },
  {
    id: 'song_2',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    releaseYear: 2020,
  },
  {
    id: 'song_3',
    title: 'Levitating',
    artist: 'Dua Lipa',
    album: 'Future Nostalgia',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    releaseYear: 2020,
  },
  {
    id: 'song_4',
    title: 'Rolling in the Deep',
    artist: 'Adele',
    album: '21',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    releaseYear: 2010,
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

const getYear = (songId: string) => demoSongs.find((song) => song.id === songId)?.releaseYear

function correctInsertIndex(game: ReturnType<typeof startGame>, song: Song): number {
  const board = game.boards[game.currentTurn!.activePlayerId]
  return findCorrectInsertIndex(song.releaseYear, board.cards, (songId) =>
    getSongById(game, songId)?.releaseYear,
  )
}

function wrongInsertIndex(game: ReturnType<typeof startGame>, song: Song): number {
  const board = game.boards[game.currentTurn!.activePlayerId]
  const getReleaseYear = (songId: string) => getSongById(game, songId)?.releaseYear

  for (let index = 0; index <= board.cards.length; index += 1) {
    if (!isPlacementCorrect(song.releaseYear, board.cards, index, getReleaseYear)) {
      return index
    }
  }

  throw new Error('Expected at least one invalid placement index')
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

  it('accepts close typos for title or artist', () => {
    expect(isGuessCorrect('shape of yo', 'Shape of You', 'Ed Sheeran')).toBe(true)
    expect(isGuessCorrect('ed sheron', 'Shape of You', 'Ed Sheeran')).toBe(true)
    expect(isGuessCorrect('weeknd', 'Blinding Lights', 'The Weeknd')).toBe(true)
    expect(isGuessCorrect('sha', 'Shape of You', 'Ed Sheeran')).toBe(false)
  })

  it('accepts manual alternate titles and artists', () => {
    expect(
      isGuessCorrect('bad guy remix', 'bad guy', 'Billie Eilish', {
        alternateTitles: ['bad guy remix'],
      }),
    ).toBe(true)
    expect(
      isGuessCorrect('billie elish', 'bad guy', 'Billie Eilish', {
        alternateArtists: ['Billie Eilish'],
      }),
    ).toBe(true)
  })
})

describe('buildAcceptableAnswers', () => {
  it('strips parentheticals and feat suffixes from titles', () => {
    const answers = buildAcceptableAnswers('Levitating (feat. DaBaby)', 'Dua Lipa')
    expect(answers).toContain('levitating')
    expect(answers).toContain('dua lipa')
  })

  it('splits collaborators and drops leading "the" from artists', () => {
    const answers = buildAcceptableAnswers('Industry Baby', 'Lil Nas X & Jack Harlow')
    expect(answers).toContain('lil nas x')
    expect(answers).toContain('jack harlow')
    expect(buildAcceptableAnswers('Blinding Lights', 'The Weeknd')).toContain('weeknd')
  })
})

describe('timeline placement', () => {
  it('validates chronological insert positions', () => {
    const timeline = ['song_1']
    expect(isPlacementCorrect(2020, timeline, 1, getYear)).toBe(true)
    expect(isPlacementCorrect(2010, timeline, 0, getYear)).toBe(true)
    expect(isPlacementCorrect(2020, timeline, 0, getYear)).toBe(false)
  })

  it('inserts cards at the requested index', () => {
    expect(insertAtIndex(['song_1'], 'song_2', 1)).toEqual(['song_1', 'song_2'])
    expect(findCorrectInsertIndex(2020, ['song_1'], getYear)).toBe(1)
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
    expect(game.albums[0].songs).toHaveLength(4)
    expect(game.boards.player_1.coins).toBe(3)
  })

  it('starts with starter cards and a shuffled deck', () => {
    const game = startGame(createGame(players, makeAlbums()))
    expect(game.phase).toBe('playing')
    expect(game.deck).toHaveLength(1)
    expect(game.boards.player_1.cards).toHaveLength(1)
    expect(game.boards.player_2.cards).toHaveLength(1)
    expect(game.boards.player_1.starterSongId).toBe(game.boards.player_1.cards[0])
    expect(game.currentTurn?.activePlayerId).toBe('player_1')
  })

  it('awards coins for a correct guess and stays in playing phase', () => {
    let game = startGame(createGame(players, makeAlbums()))
    const song = getSongById(game, game.currentTurn!.currentSongId)!

    game = submitGuess(game, song.title)
    expect(game.phase).toBe('playing')
    expect(game.boards.player_1.coins).toBe(STARTING_COINS + GUESS_REWARD_COINS)
    expect(game.currentTurn?.isCorrect).toBe(true)
  })

  it('allows placement without guessing and awards cards after reveal', () => {
    let game = startGame(createGame(players, makeAlbums()))
    const currentSongId = game.currentTurn!.currentSongId
    const song = getSongById(game, currentSongId)!
    const insertIndex = correctInsertIndex(game, song)

    game = submitPlacement(game, insertIndex)
    expect(game.phase).toBe('challenge')

    game = revealClaim(game)
    expect(game.phase).toBe('reveal')
    expect(game.lastClaimResolution?.awardedTo).toBe('player_1')
    expect(game.boards.player_1.cards).toContain(currentSongId)
    expect(game.boards.player_1.cards).toHaveLength(2)

    game = advanceTurn(game)
    expect(game.currentTurn?.activePlayerId).toBe('player_2')
  })

  it('moves wrong unchallenged placements to the discard pile', () => {
    let game = startGame(createGame(players, makeAlbums()))
    const currentSongId = game.currentTurn!.currentSongId
    const song = getSongById(game, currentSongId)!
    const wrongIndex = wrongInsertIndex(game, song)

    game = submitPlacement(game, wrongIndex)
    game = revealClaim(game)

    expect(game.lastClaimResolution?.discarded).toBe(true)
    expect(game.discardPile).toContain(currentSongId)
    expect(game.boards.player_1.cards).not.toContain(currentSongId)
  })

  it('keeps every album card visible across zones', () => {
    let game = startGame(createGame(players, makeAlbums()))
    const total = getAllSongsInAlbum(game).length
    expect(countVisibleCards(game)).toBe(total)

    const song = getSongById(game, game.currentTurn!.currentSongId)!
    game = submitPlacement(game, correctInsertIndex(game, song))
    game = revealClaim(game)
    expect(countVisibleCards(game)).toBe(total)

    game = advanceTurn(game)
    expect(countVisibleCards(game)).toBe(total)
  })

  it('gives challenged cards to the challenger when placement is wrong', () => {
    let game = startGame(createGame(players, makeAlbums()))
    const currentSongId = game.currentTurn!.currentSongId
    const song = getSongById(game, currentSongId)!
    const wrongIndex = wrongInsertIndex(game, song)

    game = submitPlacement(game, wrongIndex)
    game = submitChallenge(game, 'player_2')
    game = revealClaim(game)

    expect(game.lastClaimResolution?.placementCorrect).toBe(false)
    expect(game.lastClaimResolution?.awardedTo).toBe('player_2')
    expect(game.boards.player_2.coins).toBe(2)
    expect(game.boards.player_2.cards).toContain(currentSongId)
  })

  it('ends when the deck is exhausted', () => {
    let game = startGame(createGame(players, makeAlbums()))
    for (let i = 0; i < 2; i += 1) {
      const song = getSongById(game, game.currentTurn!.currentSongId)!
      game = submitPlacement(game, correctInsertIndex(game, song))
      game = revealClaim(game)
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

  it('allows naming the song during the challenge window', () => {
    let game = startGame(createGame(players, makeAlbums()))
    const currentSongId = game.currentTurn!.currentSongId
    const song = getSongById(game, currentSongId)!

    game = submitPlacement(game, correctInsertIndex(game, song))
    expect(game.phase).toBe('challenge')

    const pendingClaim = game.pendingClaim

    game = submitGuess(game, song.title)
    expect(game.phase).toBe('challenge')
    expect(game.pendingClaim).toEqual(pendingClaim)
    expect(game.currentTurn?.isCorrect).toBe(true)
    expect(game.boards.player_1.coins).toBe(STARTING_COINS + GUESS_REWARD_COINS)
  })

  it('marks guessed songs face-up on the timeline after a correct award', () => {
    let game = startGame(createGame(players, makeAlbums()))
    const currentSongId = game.currentTurn!.currentSongId
    const song = getSongById(game, currentSongId)!

    game = submitGuess(game, song.title)
    game = submitPlacement(game, correctInsertIndex(game, song))
    game = revealClaim(game)

    expect(game.boards.player_1.guessedSongIds).toContain(currentSongId)
    expect(game.boards.player_1.revealedSongIds).toContain(currentSongId)
  })

  it('reveals even when legacy boards are missing reveal tracking arrays', () => {
    let game = startGame(createGame(players, makeAlbums()))
    const song = getSongById(game, game.currentTurn!.currentSongId)!
    const activePlayerId = game.currentTurn!.activePlayerId

    game.boards[activePlayerId] = {
      ...game.boards[activePlayerId],
      guessedSongIds: undefined as unknown as string[],
      revealedSongIds: undefined as unknown as string[],
    }

    game = submitPlacement(game, correctInsertIndex(game, song))
    game = revealClaim(game)

    expect(game.phase).toBe('reveal')
    expect(game.boards[activePlayerId].revealedSongIds).toContain(song.id)
  })

  it('sorts scoreboard by collected cards then coins', () => {
    const game = createGame(players, makeAlbums())
    game.boards = {
      player_1: {
        coins: 3,
        cards: ['song_1', 'song_2'],
        starterSongId: 'song_1',
        guessedSongIds: [],
        revealedSongIds: [],
      },
      player_2: {
        coins: 5,
        cards: ['song_3'],
        starterSongId: 'song_3',
        guessedSongIds: [],
        revealedSongIds: [],
      },
    }
    const board = getScoreboard(game)
    expect(board[0].id).toBe('player_1')
  })
})

describe('createId', () => {
  it('generates unique ids', () => {
    expect(createId('test')).not.toBe(createId('test'))
  })
})
