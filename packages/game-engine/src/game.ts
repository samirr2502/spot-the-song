import { shuffleArray } from './shuffle.js'
import { isGuessCorrect } from './validation.js'
import {
  Album,
  DEFAULT_SETTINGS,
  GameSettings,
  GameState,
  Player,
  Song,
  Turn,
  TurnHistoryEntry,
} from './types.js'

export function createId(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
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

export function startGame(game: GameState): GameState {
  const songIds = shuffleArray(getAllSongs(game).map((song) => song.id))
  if (songIds.length === 0 || game.players.length === 0) {
    return { ...game, phase: 'finished' }
  }

  const started: GameState = {
    ...game,
    phase: 'playing',
    deck: songIds,
    playedSongIds: [],
    turnHistory: [],
    activePlayerIndex: 0,
    currentTurn: null,
    players: game.players.map((player) => ({ ...player, score: 0 })),
  }

  return startTurn(started)
}

export function startTurn(game: GameState): GameState {
  if (game.deck.length === 0) {
    return { ...game, phase: 'finished', currentTurn: null }
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
  }
}

export function submitGuess(game: GameState, guess: string): GameState {
  if (game.phase !== 'playing' || !game.currentTurn) {
    return game
  }

  const song = getSongById(game, game.currentTurn.currentSongId)
  if (!song) return game

  const correct = isGuessCorrect(guess, song.title, song.artist)

  return {
    ...game,
    phase: 'reveal',
    currentTurn: {
      ...game.currentTurn,
      guess,
      isCorrect: correct,
    },
  }
}

export function revealAndScore(game: GameState): GameState {
  if (!game.currentTurn || game.currentTurn.isCorrect === undefined) {
    return game
  }

  const { currentTurn } = game
  const historyEntry: TurnHistoryEntry = {
    playerId: currentTurn.activePlayerId,
    songId: currentTurn.currentSongId,
    guess: currentTurn.guess ?? '',
    isCorrect: currentTurn.isCorrect === true,
  }

  const players = game.players.map((player) =>
    player.id === currentTurn.activePlayerId && currentTurn.isCorrect
      ? { ...player, score: player.score + 1 }
      : player,
  )

  return {
    ...game,
    players,
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
  if (!isTimerExpired(game)) return game
  return submitGuess(game, '')
}

export function getScoreboard(game: GameState): Player[] {
  return [...game.players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const aWrong = game.turnHistory.filter(
      (entry) => entry.playerId === a.id && !entry.isCorrect,
    ).length
    const bWrong = game.turnHistory.filter(
      (entry) => entry.playerId === b.id && !entry.isCorrect,
    ).length
    return aWrong - bWrong
  })
}

export type GameAction =
  | { type: 'START_GAME' }
  | { type: 'SUBMIT_GUESS'; guess: string }
  | { type: 'TIMEOUT' }
  | { type: 'ADVANCE_TURN' }

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      return startGame(state)
    case 'SUBMIT_GUESS':
      return submitGuess(state, action.guess)
    case 'TIMEOUT':
      return submitTimeout(state)
    case 'ADVANCE_TURN':
      return advanceTurn(state)
    default:
      return state
  }
}
