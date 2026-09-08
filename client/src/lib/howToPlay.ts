import type { GameSettings } from '@spot-the-song/shared'

export type HowToPlayModeId = 'all-in' | 'turn-guess' | 'sing-along' | 'timeline'

export type HowToPlayMode = {
  id: HowToPlayModeId
  title: string
  tagline: string
  steps: string[]
}

export const HOW_TO_PLAY_OVERVIEW = [
  'Enter your name, then join a room with a code or QR — or create a game as host.',
  'The host picks a Spotify playlist or album and configures rounds, clip length, and guess fields.',
  'When the host starts, everyone reads the rules and taps I\'m ready.',
  'Listen to each round\'s clip through the host\'s speakers (preview playback on the host\'s phone).',
  'Score points each round — highest total after all rounds wins.',
]

export const HOW_TO_PLAY_MODES: HowToPlayMode[] = [
  {
    id: 'all-in',
    title: 'All In',
    tagline: 'Everyone guesses at once on their own phone.',
    steps: [
      'Listen to the clip when each round starts.',
      'Fill in every field the host enabled (title, artist, album, year).',
      'Submit before time runs out — faster answers earn a speed bonus.',
      'Each correct field scores points; wrong fields score zero.',
      'Most total points after all rounds wins.',
    ],
  },
  {
    id: 'turn-guess',
    title: 'Turn Guess',
    tagline: 'One player guesses aloud — everyone else votes.',
    steps: [
      'Each round, one player is active — they listen and guess aloud.',
      'When voting starts, judges see the song and vote YES or NO on each field.',
      'The active player does not see the song until results.',
      'Majority wins per field — ties count as NO.',
      'Most total points after all rounds wins.',
    ],
  },
  {
    id: 'sing-along',
    title: 'Sing Along',
    tagline: 'Perform a mystery song — the audience rates you.',
    steps: [
      'Each round, one player performs — they open a blind Spotify link without seeing the title.',
      'Everyone else listens while they sing along to the mystery song.',
      'When the host starts voting, judges see the song and rate the performance 1–10.',
      'The performer only sees the song after ratings are in.',
      'Most total points after all rounds wins.',
    ],
  },
  {
    id: 'timeline',
    title: 'Timeline',
    tagline: 'Place songs in chronological order on your personal timeline.',
    steps: [
      'Everyone starts with one revealed starter song and 3 coins.',
      'On your turn, listen to a hidden-year clip and place the card on your timeline.',
      'Optional title/artist guesses earn +1 coin each (and bonus points if placement is correct).',
      'After placement locks, other players can spend 2 coins to challenge before the reveal.',
      'If a challenge succeeds on a wrong placement, the challenger gets the card. First to collect the target number of cards wins — points break ties.',
    ],
  },
]

export function getHowToPlayModeForSettings(settings: GameSettings): HowToPlayMode {
  if (settings.playMode === 'all-in') {
    return HOW_TO_PLAY_MODES.find((mode) => mode.id === 'all-in')!
  }

  switch (settings.turnGame) {
    case 'sing':
      return HOW_TO_PLAY_MODES.find((mode) => mode.id === 'sing-along')!
    case 'timeline':
      return HOW_TO_PLAY_MODES.find((mode) => mode.id === 'timeline')!
    default:
      return HOW_TO_PLAY_MODES.find((mode) => mode.id === 'turn-guess')!
  }
}
