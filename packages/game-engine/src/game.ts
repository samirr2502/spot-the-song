import { shuffleArray } from './shuffle.js'
import {
  CHALLENGE_COST,
  findCorrectInsertIndex,
  GUESS_REWARD_COINS,
  insertAtIndex,
  isPlacementCorrect,
  STARTING_COINS,
} from './timeline.js'
import { isGuessCorrect } from './validation.js'
import {
  Album,
  ClaimResolution,
  DEFAULT_SETTINGS,
  GameSettings,
  GameState,
  Player,
  PlayerBoard,
  Song,
  Turn,
  TurnHistoryEntry,
} from './types.js'

export function createId(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function createPlayerBoard(): PlayerBoard {
  return {
    coins: STARTING_COINS,
    cards: [],
    starterSongId: null,
    guessedSongIds: [],
    revealedSongIds: [],
  }
}

function getReleaseYearForGame(game: GameState, songId: string): number | undefined {
  return getSongById(game, songId)?.releaseYear
}

export function createGame(
  players: Array<Pick<Player, 'id' | 'name'>>,
  albums: Album[],
  settings: Partial<GameSettings> = {},
  gameId = createId('game'),
): GameState {
  const orderedPlayers: Player[] = players.map((player, index) => ({
    id: player.id,
    name: player.name,
    score: 0,
    order: index,
  }))

  const boards = orderedPlayers.reduce<Record<string, PlayerBoard>>((acc, player) => {
    acc[player.id] = createPlayerBoard()
    return acc
  }, {})

  return {
    id: gameId,
    phase: 'lobby',
    players: orderedPlayers,
    albums,
    deck: [],
    playedSongIds: [],
    currentTurn: null,
    turnHistory: [],
    settings: { ...DEFAULT_SETTINGS, ...settings },
    activePlayerIndex: 0,
    boards,
    pendingClaim: null,
    lastClaimResolution: null,
  }
}

export function getAllSongs(game: GameState): Song[] {
  return game.albums.flatMap((album) => album.songs)
}

export function getSongById(game: GameState, songId: string): Song | undefined {
  return getAllSongs(game).find((song) => song.id === songId)
}

export function getActivePlayer(game: GameState): Player | undefined {
  return game.players[game.activePlayerIndex]
}

export function getPlayerBoard(game: GameState, playerId: string): PlayerBoard | undefined {
  return game.boards[playerId]
}

export function startGame(game: GameState): GameState {
  const allSongIds = shuffleArray(getAllSongs(game).map((song) => song.id))
  if (allSongIds.length < game.players.length || game.players.length === 0) {
    return { ...game, phase: 'finished' }
  }

  const starterIds = allSongIds.slice(0, game.players.length)
  const deckIds = allSongIds.slice(game.players.length)

  const boards = Object.fromEntries(
    game.players.map((player, index) => [
      player.id,
      {
        coins: STARTING_COINS,
        cards: [starterIds[index]],
        starterSongId: starterIds[index],
        guessedSongIds: [],
        revealedSongIds: [],
      },
    ]),
  )

  const started: GameState = {
    ...game,
    phase: 'playing',
    deck: deckIds,
    playedSongIds: [],
    turnHistory: [],
    activePlayerIndex: 0,
    currentTurn: null,
    players: game.players.map((player) => ({ ...player, score: 0 })),
    boards,
    pendingClaim: null,
    lastClaimResolution: null,
  }

  return startTurn(started)
}

export function startTurn(game: GameState): GameState {
  if (game.deck.length === 0) {
    return { ...game, phase: 'finished', currentTurn: null, pendingClaim: null }
  }

  const [currentSongId, ...remainingDeck] = game.deck
  const activePlayer = game.players[game.activePlayerIndex]
  const now = Date.now()

  const turn: Turn = {
    activePlayerId: activePlayer.id,
    currentSongId,
    startedAt: now,
    guessDeadline: now + game.settings.guessTimeSeconds * 1000,
  }

  return {
    ...game,
    phase: 'playing',
    deck: remainingDeck,
    currentTurn: turn,
    pendingClaim: null,
    lastClaimResolution: null,
  }
}

export function submitGuess(game: GameState, guess: string): GameState {
  if (!game.currentTurn) return game
  if (game.phase !== 'playing' && game.phase !== 'challenge') {
    return game
  }
  if (game.currentTurn.guess !== undefined) return game

  const song = getSongById(game, game.currentTurn.currentSongId)
  if (!song) return game

  const correct = isGuessCorrect(guess, song.title, song.artist, {
    alternateTitles: song.alternateTitles,
    alternateArtists: song.alternateArtists,
  })

  const activePlayerId = game.currentTurn.activePlayerId
  const board = game.boards[activePlayerId]
  if (!board) return game

  const nextBoards = correct
    ? {
        ...game.boards,
        [activePlayerId]: {
          ...board,
          coins: board.coins + GUESS_REWARD_COINS,
        },
      }
    : game.boards

  return {
    ...game,
    boards: nextBoards,
    currentTurn: {
      ...game.currentTurn,
      guess,
      isCorrect: correct,
    },
  }
}

export function submitPlacement(game: GameState, insertIndex: number): GameState {
  if (game.phase !== 'playing' || !game.currentTurn) {
    return game
  }

  const claimantId = game.currentTurn.activePlayerId
  const board = game.boards[claimantId]
  if (!board) return game

  const index = Math.max(0, Math.min(insertIndex, board.cards.length))

  return {
    ...game,
    phase: 'challenge',
    pendingClaim: {
      songId: game.currentTurn.currentSongId,
      claimantId,
      insertIndex: index,
      challengerId: null,
    },
  }
}

export function submitChallenge(game: GameState, challengerId: string): GameState {
  if (game.phase !== 'challenge' || !game.pendingClaim) {
    return game
  }

  if (challengerId === game.pendingClaim.claimantId) return game
  if (game.pendingClaim.challengerId) return game

  const board = game.boards[challengerId]
  if (!board || board.coins < CHALLENGE_COST) return game

  return {
    ...game,
    boards: {
      ...game.boards,
      [challengerId]: {
        ...board,
        coins: board.coins - CHALLENGE_COST,
      },
    },
    pendingClaim: {
      ...game.pendingClaim,
      challengerId,
    },
  }
}

function awardCardToPlayer(
  game: GameState,
  boards: Record<string, PlayerBoard>,
  playerId: string,
  songId: string,
  preferredInsertIndex: number | null,
  guessedCorrectly: boolean,
  revealOnTimeline: boolean,
): Record<string, PlayerBoard> {
  const board = boards[playerId]
  if (!board) return boards

  const song = getSongById(game, songId)
  if (!song) return boards

  const getYear = (id: string) => getReleaseYearForGame(game, id)
  const insertIndex =
    preferredInsertIndex !== null &&
    isPlacementCorrect(song.releaseYear, board.cards, preferredInsertIndex, getYear)
      ? preferredInsertIndex
      : findCorrectInsertIndex(song.releaseYear, board.cards, getYear)

  const guessedSongIds =
    guessedCorrectly && !board.guessedSongIds.includes(songId)
      ? [...board.guessedSongIds, songId]
      : board.guessedSongIds

  const revealedSongIds =
    revealOnTimeline && !board.revealedSongIds.includes(songId)
      ? [...board.revealedSongIds, songId]
      : board.revealedSongIds

  return {
    ...boards,
    [playerId]: {
      ...board,
      cards: insertAtIndex(board.cards, songId, insertIndex),
      guessedSongIds,
      revealedSongIds,
    },
  }
}

export function revealClaim(game: GameState): GameState {
  if (game.phase !== 'challenge' || !game.pendingClaim || !game.currentTurn) {
    return game
  }

  const song = getSongById(game, game.pendingClaim.songId)
  if (!song) return game

  const claimantBoard = game.boards[game.pendingClaim.claimantId]
  const getYear = (id: string) => getReleaseYearForGame(game, id)
  const placementCorrect = claimantBoard
    ? isPlacementCorrect(
        song.releaseYear,
        claimantBoard.cards,
        game.pendingClaim.insertIndex,
        getYear,
      )
    : false

  let boards = { ...game.boards }
  let awardedTo: string | null = null
  let discarded = false
  const guessCorrect = game.currentTurn.isCorrect === true

  if (placementCorrect) {
    boards = awardCardToPlayer(
      game,
      boards,
      game.pendingClaim.claimantId,
      game.pendingClaim.songId,
      game.pendingClaim.insertIndex,
      guessCorrect,
      true,
    )
    awardedTo = game.pendingClaim.claimantId
  } else if (game.pendingClaim.challengerId) {
    boards = awardCardToPlayer(
      game,
      boards,
      game.pendingClaim.challengerId,
      game.pendingClaim.songId,
      null,
      false,
      true,
    )
    awardedTo = game.pendingClaim.challengerId
  } else {
    discarded = true
  }

  const resolution: ClaimResolution = {
    songId: song.id,
    releaseYear: song.releaseYear,
    placementCorrect,
    awardedTo,
    discarded,
    challengerId: game.pendingClaim.challengerId,
    guessCorrect,
    coinsAwarded: guessCorrect ? GUESS_REWARD_COINS : 0,
  }

  return {
    ...game,
    phase: 'reveal',
    boards,
    pendingClaim: null,
    lastClaimResolution: resolution,
  }
}

export function revealAndScore(game: GameState): GameState {
  if (!game.currentTurn) return game

  const { currentTurn } = game
  const historyEntry: TurnHistoryEntry = {
    playerId: currentTurn.activePlayerId,
    songId: currentTurn.currentSongId,
    guess: currentTurn.guess ?? '',
    isCorrect: currentTurn.isCorrect === true,
  }

  return {
    ...game,
    playedSongIds: [...game.playedSongIds, currentTurn.currentSongId],
    turnHistory: [...game.turnHistory, historyEntry],
  }
}

export function advanceTurn(game: GameState): GameState {
  const scored = revealAndScore(game)
  if (scored.phase === 'finished') return scored

  const nextIndex = (scored.activePlayerIndex + 1) % scored.players.length
  const nextGame: GameState = {
    ...scored,
    activePlayerIndex: nextIndex,
    currentTurn: null,
    pendingClaim: null,
    lastClaimResolution: null,
  }

  if (nextGame.deck.length === 0) {
    return { ...nextGame, phase: 'finished', currentTurn: null }
  }

  return startTurn(nextGame)
}

export function getRemainingSeconds(game: GameState, now = Date.now()): number {
  if (!game.currentTurn) return 0
  return Math.max(0, Math.ceil((game.currentTurn.guessDeadline - now) / 1000))
}

export function isTimerExpired(game: GameState, now = Date.now()): boolean {
  if (!game.currentTurn || game.phase !== 'playing') return false
  return now >= game.currentTurn.guessDeadline
}

export function submitTimeout(game: GameState): GameState {
  if (!isTimerExpired(game) || !game.currentTurn) return game

  const board = game.boards[game.currentTurn.activePlayerId]
  if (!board) return game

  return submitPlacement(game, board.cards.length)
}

export function getScoreboard(game: GameState): Player[] {
  return [...game.players].sort((a, b) => {
    const emptyBoard = {
      cards: [],
      coins: 0,
      starterSongId: null,
      guessedSongIds: [],
      revealedSongIds: [],
    }
    const aCards = countCollectedCards(game.boards[a.id] ?? emptyBoard)
    const bCards = countCollectedCards(game.boards[b.id] ?? emptyBoard)
    if (bCards !== aCards) return bCards - aCards

    const aCoins = game.boards[a.id]?.coins ?? 0
    const bCoins = game.boards[b.id]?.coins ?? 0
    if (bCoins !== aCoins) return bCoins - aCoins

    const aGuesses = game.turnHistory.filter(
      (entry) => entry.playerId === a.id && entry.isCorrect,
    ).length
    const bGuesses = game.turnHistory.filter(
      (entry) => entry.playerId === b.id && entry.isCorrect,
    ).length
    return bGuesses - aGuesses
  })
}

export function countCollectedCards(board: PlayerBoard): number {
  return board.cards.length
}

export type GameAction =
  | { type: 'START_GAME' }
  | { type: 'SUBMIT_GUESS'; guess: string }
  | { type: 'SUBMIT_PLACEMENT'; insertIndex: number }
  | { type: 'SUBMIT_CHALLENGE'; challengerId: string }
  | { type: 'REVEAL_CLAIM' }
  | { type: 'TIMEOUT' }
  | { type: 'ADVANCE_TURN' }

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      return startGame(state)
    case 'SUBMIT_GUESS':
      return submitGuess(state, action.guess)
    case 'SUBMIT_PLACEMENT':
      return submitPlacement(state, action.insertIndex)
    case 'SUBMIT_CHALLENGE':
      return submitChallenge(state, action.challengerId)
    case 'REVEAL_CLAIM':
      return revealClaim(state)
    case 'TIMEOUT':
      return submitTimeout(state)
    case 'ADVANCE_TURN':
      return advanceTurn(state)
    default:
      return state
  }
}
