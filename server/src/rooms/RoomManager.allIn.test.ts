import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Track } from '@spot-the-song/shared'
import { DEFAULT_GAME_SETTINGS } from '@spot-the-song/shared'
import type { RoundResultsPayload } from '@spot-the-song/shared'
import { resolveMusicImport } from '../music/resolveMusicImport.js'
import { RoomManager } from './RoomManager.js'

vi.mock('../music/resolveMusicImport.js', () => ({
  resolveMusicImport: vi.fn(),
}))

const TEST_PLAYLIST_URL = 'https://open.spotify.com/playlist/test123'

const MOCK_TRACKS: Track[] = [
  {
    id: 'track_a',
    title: 'Song A',
    artist: 'Artist A',
    album: 'Album A',
    year: 2000,
    artworkUrl: null,
    spotifyUri: 'spotify:track:a',
    spotifyUrl: 'https://open.spotify.com/track/a',
    durationMs: 180_000,
  },
  {
    id: 'track_b',
    title: 'Song B',
    artist: 'Artist B',
    album: 'Album B',
    year: 2001,
    artworkUrl: null,
    spotifyUri: 'spotify:track:b',
    spotifyUrl: 'https://open.spotify.com/track/b',
    durationMs: 180_000,
  },
  {
    id: 'track_c',
    title: 'Song C',
    artist: 'Artist C',
    album: 'Album C',
    year: 2002,
    artworkUrl: null,
    spotifyUri: 'spotify:track:c',
    spotifyUrl: 'https://open.spotify.com/track/c',
    durationMs: 180_000,
  },
]

describe('RoomManager All In lifecycle', () => {
  let manager: RoomManager
  let lastRoundResults: RoundResultsPayload | null

  beforeEach(() => {
    vi.useFakeTimers()
    lastRoundResults = null
    manager = new RoomManager()
    manager.setEmitHandlers({
      onRoomUpdated: () => {},
      onRoundResults: (_roomId, payload) => {
        lastRoundResults = payload
      },
      onHostPlayClip: () => {},
      onSpotifyPlayTrack: () => {},
      onRoundClipEnded: () => {},
    })

    vi.mocked(resolveMusicImport).mockResolvedValue({
      name: 'Test Playlist',
      tracks: MOCK_TRACKS,
      skippedCount: 0,
      source: 'spotify',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('runs lobby → how-to-play → round → results → final scores', async () => {
    const settings = {
      ...DEFAULT_GAME_SETTINGS,
      playMode: 'all-in' as const,
      roundCount: 1,
      clipDurationSeconds: 15,
      guessTimerSeconds: 0,
    }

    const hostResult = await manager.createRoom('Host', settings, TEST_PLAYLIST_URL)
    expect(hostResult.ok).toBe(true)
    if (!hostResult.ok) return

    const roomId = hostResult.room.id
    const hostId = hostResult.player.id

    const guestResult = manager.joinRoom(hostResult.room.code, 'Guest')
    expect(guestResult.ok).toBe(true)
    if (!guestResult.ok) return

    const startResult = manager.startGame(roomId, hostId)
    expect(startResult.ok).toBe(true)
    if (!startResult.ok) return
    expect(startResult.room.status).toBe('how-to-play')

    manager.ackHowToPlay(roomId, hostId)
    const readyResult = manager.ackHowToPlay(roomId, guestResult.player.id)
    expect(readyResult.ok).toBe(true)
    if (!readyResult.ok) return
    expect(readyResult.room.status).toBe('playing')
    expect(readyResult.room.currentRound?.phase).toBe('round-intro')

    await vi.advanceTimersByTimeAsync(2_000)

    let room = manager.getPublicRoom(roomId)!
    expect(room.currentRound?.phase).toBe('clip-playing')

    const hostSubmit = manager.submitAnswers(roomId, hostId, { title: 'Song A' })
    expect(hostSubmit.ok).toBe(true)

    const guestSubmit = manager.submitAnswers(roomId, guestResult.player.id, { title: 'Wrong' })
    expect(guestSubmit.ok).toBe(true)

    await vi.advanceTimersByTimeAsync(15_000)

    room = manager.getPublicRoom(roomId)!
    expect(room.status).toBe('round-results')
    expect(room.currentRound?.phase).toBe('reveal')
    expect(lastRoundResults).not.toBeNull()
    expect(lastRoundResults?.mode).toBe('all-in')
    expect(lastRoundResults?.playerResults).toHaveLength(2)

    const continueResult = manager.continueAfterResults(roomId, hostId)
    expect(continueResult.ok).toBe(true)
    if (!continueResult.ok) return
    expect(continueResult.room.status).toBe('final-results')
    expect(continueResult.room.currentRound).toBeNull()
  })
})
