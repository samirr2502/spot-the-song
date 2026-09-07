import type { Album, GameState, Song } from '@spot-the-song/game-engine'
import {
  GUESS_REWARD_COINS,
  shuffleArray,
  STARTING_COINS,
} from '@spot-the-song/game-engine'
import { callGameAction } from './gameAction'
import {
  DbAlbum,
  DbGameDeck,
  DbRoom,
  DbRoomPlayer,
  DbSong,
  DbTimelineCard,
  DbTurn,
  generateRoomCode,
  getPlayerSessionId,
  supabase,
} from './supabase'

function getCardPosition(card: DbTimelineCard): number {
  return card.position ?? card.slot_index ?? 0
}

export async function createRoom(hostName: string) {
  if (!supabase) throw new Error('Supabase is not configured')

  const playerId = getPlayerSessionId()
  const code = generateRoomCode()

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({
      code,
      host_player_id: playerId,
      mode: 'online',
      phase: 'lobby',
      settings: { guessTimeSeconds: 30 },
    })
    .select()
    .single()

  if (roomError || !room) throw roomError ?? new Error('Failed to create room')

  const { error: playerError } = await supabase.from('room_players').insert({
    room_id: room.id,
    player_id: playerId,
    name: hostName,
    score: 0,
    turn_order: 0,
    is_host: true,
    coins: STARTING_COINS,
  })

  if (playerError) throw playerError

  return { room: room as DbRoom, playerId }
}

export async function joinRoom(code: string, playerName: string) {
  if (!supabase) throw new Error('Supabase is not configured')

  const playerId = getPlayerSessionId()
  const normalizedCode = code.trim().toUpperCase()

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', normalizedCode)
    .single()

  if (roomError || !room) throw new Error('Room not found')

  const { data: existing } = await supabase
    .from('room_players')
    .select('id')
    .eq('room_id', room.id)
    .eq('player_id', playerId)
    .maybeSingle()

  if (!existing) {
    const { count } = await supabase
      .from('room_players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', room.id)

    const { error: playerError } = await supabase.from('room_players').insert({
      room_id: room.id,
      player_id: playerId,
      name: playerName,
      score: 0,
      turn_order: count ?? 0,
      is_host: false,
      coins: STARTING_COINS,
    })

    if (playerError) throw playerError
  }

  return { room: room as DbRoom, playerId }
}

export async function fetchRoomState(roomId: string) {
  if (!supabase) throw new Error('Supabase is not configured')

  const [roomRes, playersRes, albumsRes, deckRes, turnRes, timelineRes] =
    await Promise.all([
      supabase.from('rooms').select('*').eq('id', roomId).single(),
      supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId)
        .order('turn_order'),
      supabase.from('albums').select('*').eq('room_id', roomId),
      supabase
        .from('game_deck')
        .select('*')
        .eq('room_id', roomId)
        .order('position'),
      supabase
        .from('turns')
        .select('*')
        .eq('room_id', roomId)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('player_timeline_cards').select('*').eq('room_id', roomId),
    ])

  if (roomRes.error || !roomRes.data) throw roomRes.error ?? new Error('Room not found')

  const albumIds = (albumsRes.data ?? []).map((album) => album.id)
  let songs: DbSong[] = []
  if (albumIds.length > 0) {
    const songsRes = await supabase.from('songs').select('*').in('album_id', albumIds)
    if (songsRes.error) throw songsRes.error
    songs = (songsRes.data ?? []) as DbSong[]
  }

  return {
    room: roomRes.data as DbRoom,
    players: (playersRes.data ?? []) as DbRoomPlayer[],
    albums: (albumsRes.data ?? []) as DbAlbum[],
    songs,
    deck: (deckRes.data ?? []) as DbGameDeck[],
    currentTurn: (turnRes.data ?? null) as DbTurn | null,
    timelineCards: (timelineRes.data ?? []) as DbTimelineCard[],
  }
}

export async function addAlbumToRoom(
  roomId: string,
  playerId: string,
  album: Album,
) {
  if (!supabase) throw new Error('Supabase is not configured')

  const { data: albumRow, error: albumError } = await supabase
    .from('albums')
    .insert({
      room_id: roomId,
      player_id: playerId,
      name: album.name,
    })
    .select()
    .single()

  if (albumError || !albumRow) throw albumError ?? new Error('Failed to add album')

  const songRows = album.songs.map((song) => ({
    album_id: albumRow.id,
    title: song.title,
    artist: song.artist,
    audio_url: song.audioUrl,
    release_year: song.releaseYear,
  }))

  const { error: songsError } = await supabase.from('songs').insert(songRows)
  if (songsError) throw songsError
}

export async function startOnlineGame(roomId: string, hostPlayerId: string) {
  if (!supabase) throw new Error('Supabase is not configured')

  const state = await fetchRoomState(roomId)
  if (state.room.host_player_id !== hostPlayerId) {
    throw new Error('Only the host can start the game')
  }

  const shuffled = shuffleArray(state.songs.map((song) => song.id))
  const playerCount = state.players.length
  if (shuffled.length < playerCount || playerCount === 0) {
    throw new Error('Need at least one song per player to start')
  }

  const starterIds = shuffled.slice(0, playerCount)
  const deckIds = shuffled.slice(playerCount)

  const deckRows = deckIds.map((songId, index) => ({
    room_id: roomId,
    song_id: songId,
    position: index,
    played: false,
  }))

  await supabase.from('game_deck').delete().eq('room_id', roomId)
  await supabase.from('turns').delete().eq('room_id', roomId)
  await supabase.from('player_timeline_cards').delete().eq('room_id', roomId)

  const { error: deckError } = await supabase.from('game_deck').insert(deckRows)
  if (deckError) {
    throw new Error(deckError.message || 'Failed to create deck')
  }

  const starterRows = state.players.map((player, index) => ({
    room_id: roomId,
    player_id: player.player_id,
    song_id: starterIds[index],
    position: 0,
    is_starter: true,
    is_revealed: true,
  }))

  const { error: starterError } = await supabase
    .from('player_timeline_cards')
    .insert(starterRows)
  if (starterError) {
    throw new Error(starterError.message || 'Failed to deal starter cards')
  }

  const { error: scoreError } = await supabase
    .from('room_players')
    .update({ score: 0 })
    .eq('room_id', roomId)
  if (scoreError) {
    throw new Error(scoreError.message || 'Failed to reset player scores')
  }

  const { error: phaseError } = await supabase
    .from('rooms')
    .update({ phase: 'playing' })
    .eq('id', roomId)
  if (phaseError) {
    throw new Error(phaseError.message || 'Failed to start game phase')
  }

  if (deckIds.length === 0) {
    await supabase.from('rooms').update({ phase: 'finished' }).eq('id', roomId)
    return
  }

  await createNextTurn(roomId, state.players[0].player_id, deckIds[0])
}

async function createNextTurn(
  roomId: string,
  activePlayerId: string,
  songId: string,
) {
  if (!supabase) throw new Error('Supabase is not configured')

  const { error } = await supabase.from('turns').insert({
    room_id: roomId,
    active_player_id: activePlayerId,
    song_id: songId,
    guess: null,
    is_correct: null,
    started_at: new Date().toISOString(),
  })

  if (error) {
    throw new Error(error.message || 'Failed to create turn')
  }
}

export async function submitOnlineGuess(
  roomId: string,
  turnId: string,
  activePlayerId: string,
  guess: string,
) {
  await callGameAction('guess', roomId, activePlayerId, { turnId, guess })
}

export async function submitOnlinePlacement(
  roomId: string,
  turnId: string,
  activePlayerId: string,
  insertIndex: number,
) {
  await callGameAction('placement', roomId, activePlayerId, { turnId, insertIndex })
}

export async function submitOnlineChallenge(
  roomId: string,
  turnId: string,
  challengerId: string,
) {
  await callGameAction('challenge', roomId, challengerId, { turnId, challengerId })
}

export async function revealOnlineClaim(roomId: string, turnId: string) {
  const playerId = getPlayerSessionId()
  await callGameAction('reveal', roomId, playerId, { turnId })
}

export async function advanceOnlineTurn(roomId: string, hostPlayerId: string) {
  await callGameAction('advance', roomId, hostPlayerId, {})
}

export function buildOnlineDeckAndDiscard(
  deck: DbGameDeck[],
  timelineCards: DbTimelineCard[],
  currentTurn: DbTurn | null,
  phase: string,
): { deck: string[]; discardPile: string[] } {
  const timelineSongIds = new Set(timelineCards.map((card) => card.song_id))
  const currentSongId = currentTurn?.song_id

  const deckIds = deck
    .filter((card) => !card.played && card.song_id !== currentSongId)
    .sort((a, b) => a.position - b.position)
    .map((card) => card.song_id)

  let discardPile = deck
    .filter((card) => card.played && !timelineSongIds.has(card.song_id))
    .map((card) => card.song_id)

  if (phase === 'reveal' && currentTurn?.claim_discarded && currentSongId) {
    if (!discardPile.includes(currentSongId)) {
      discardPile = [...discardPile, currentSongId]
    }
  }

  return { deck: deckIds, discardPile }
}

export function mapRoomStateToGame(
  state: Awaited<ReturnType<typeof fetchRoomState>>,
): GameState {
  const phase = state.room.phase === 'placement' ? 'playing' : state.room.phase
  const revealedIds = collectRevealedSongIds(
    state.timelineCards,
    phase,
    state.currentTurn,
  )
  const lookup = mapSongsToLookup(state.songs, state.albums, revealedIds)
  const songs = Object.values(lookup)
  const guessTimeSeconds = state.room.settings?.guessTimeSeconds ?? 30
  const startedAt = state.currentTurn
    ? new Date(state.currentTurn.started_at).getTime()
    : Date.now()
  const { deck, discardPile } = buildOnlineDeckAndDiscard(
    state.deck,
    state.timelineCards,
    state.currentTurn,
    phase,
  )

  return {
    id: state.room.id,
    phase,
    players: state.players.map((player) => ({
      id: player.player_id,
      name: player.name,
      score: player.score,
      order: player.turn_order,
    })),
    albums: songs.length
      ? [{ id: 'online', name: 'Room Songs', ownerPlayerId: 'online', songs }]
      : [],
    deck,
    discardPile,
    playedSongIds: state.deck.filter((card) => card.played).map((card) => card.song_id),
    currentTurn: state.currentTurn
      ? {
          activePlayerId: state.currentTurn.active_player_id,
          currentSongId: state.currentTurn.song_id,
          startedAt,
          guessDeadline: startedAt + guessTimeSeconds * 1000,
          guess: state.currentTurn.guess ?? undefined,
          isCorrect: state.currentTurn.is_correct ?? undefined,
        }
      : null,
    turnHistory: [],
    settings: { guessTimeSeconds },
    activePlayerIndex: state.players.findIndex(
      (player) => player.player_id === state.currentTurn?.active_player_id,
    ),
    boards: buildBoardsFromTimeline(state.players, state.timelineCards),
    pendingClaim:
      state.room.phase === 'challenge' &&
      state.currentTurn &&
      (state.currentTurn.insert_index ?? state.currentTurn.claimed_slot) !== null
        ? {
            songId: state.currentTurn.song_id,
            claimantId: state.currentTurn.active_player_id,
            insertIndex:
              state.currentTurn.insert_index ?? state.currentTurn.claimed_slot ?? 0,
            challengerId: state.currentTurn.challenger_player_id,
          }
        : null,
    lastClaimResolution:
      state.room.phase === 'reveal' &&
      state.currentTurn &&
      (state.currentTurn.insert_index ?? state.currentTurn.claimed_slot) !== null
        ? {
            songId: state.currentTurn.song_id,
            releaseYear: lookup[state.currentTurn.song_id]?.releaseYear ?? 2000,
            placementCorrect:
              state.currentTurn.claim_awarded_to === state.currentTurn.active_player_id,
            awardedTo: state.currentTurn.claim_awarded_to,
            discarded: state.currentTurn.claim_discarded,
            challengerId: state.currentTurn.challenger_player_id,
            guessCorrect: state.currentTurn.is_correct === true,
            coinsAwarded: state.currentTurn.is_correct ? GUESS_REWARD_COINS : 0,
          }
        : null,
  }
}

export function collectRevealedSongIds(
  timelineCards: DbTimelineCard[],
  phase: string,
  currentTurn: DbTurn | null,
): Set<string> {
  const ids = new Set<string>()
  for (const card of timelineCards) {
    if (card.is_revealed || card.is_starter) {
      ids.add(card.song_id)
    }
  }
  if (phase === 'reveal' && currentTurn?.song_id) {
    ids.add(currentTurn.song_id)
  }
  return ids
}

export function mapSongsToLookup(
  songs: DbSong[],
  albums: DbAlbum[] = [],
  revealedSongIds?: Set<string>,
): Record<string, Song> {
  const albumNames = albums.reduce<Record<string, string>>((acc, album) => {
    acc[album.id] = album.name
    return acc
  }, {})

  return songs.reduce<Record<string, Song>>((acc, song) => {
    const isRevealed = !revealedSongIds || revealedSongIds.has(song.id)
    acc[song.id] = {
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: albumNames[song.album_id] ?? '',
      audioUrl: song.audio_url,
      releaseYear: isRevealed ? (song.release_year ?? 2000) : 0,
    }
    return acc
  }, {})
}

export function buildBoardsFromTimeline(
  players: DbRoomPlayer[],
  timelineCards: DbTimelineCard[],
) {
  const boards = players.reduce<
    Record<
      string,
      { coins: number; cards: string[]; starterSongId: string | null; guessedSongIds: string[]; revealedSongIds: string[] }
    >
  >((acc, player) => {
    acc[player.player_id] = {
      coins: player.coins ?? STARTING_COINS,
      cards: [],
      starterSongId: null,
      guessedSongIds: [],
      revealedSongIds: [],
    }
    return acc
  }, {})

  for (const player of players) {
    const playerCards = timelineCards
      .filter((card) => card.player_id === player.player_id)
      .sort((a, b) => getCardPosition(a) - getCardPosition(b))

    const board = boards[player.player_id]
    if (!board) continue

    board.cards = playerCards.map((card) => card.song_id)
    board.guessedSongIds = playerCards.filter((card) => card.is_guessed).map((card) => card.song_id)
    board.revealedSongIds = playerCards
      .filter((card) => card.is_revealed || card.is_starter)
      .map((card) => card.song_id)
    const starter = playerCards.find((card) => card.is_starter)
    board.starterSongId = starter?.song_id ?? playerCards[0]?.song_id ?? null
  }

  return boards
}

export function subscribeToRoom(
  roomId: string,
  onChange: () => void,
) {
  const client = supabase
  if (!client) return () => {}

  const channel = client
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'turns', filter: `room_id=eq.${roomId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'albums', filter: `room_id=eq.${roomId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'songs' },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'game_deck', filter: `room_id=eq.${roomId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'player_timeline_cards', filter: `room_id=eq.${roomId}` },
      onChange,
    )
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}
