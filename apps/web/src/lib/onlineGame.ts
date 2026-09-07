import type { Album, Song } from '@spot-the-song/game-engine'
import {
  findCorrectInsertIndex,
  GUESS_REWARD_COINS,
  isPlacementCorrect,
  shuffleArray,
  STARTING_COINS,
  CHALLENGE_COST,
} from '@spot-the-song/game-engine'
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

function getTurnInsertIndex(turn: DbTurn): number | null {
  return turn.insert_index ?? turn.claimed_slot ?? null
}

function getCardPosition(card: DbTimelineCard): number {
  return card.position ?? card.slot_index ?? 0
}

function buildOrderedSongIds(cards: DbTimelineCard[], playerId: string): string[] {
  return cards
    .filter((card) => card.player_id === playerId)
    .sort((a, b) => getCardPosition(a) - getCardPosition(b))
    .map((card) => card.song_id)
}

async function insertTimelineCardAt(
  roomId: string,
  playerId: string,
  songId: string,
  insertIndex: number,
  isStarter = false,
  isGuessed = false,
  isRevealed = false,
  existingCards: DbTimelineCard[] = [],
) {
  if (!supabase) throw new Error('Supabase is not configured')

  const playerCards = existingCards
    .filter((card) => card.player_id === playerId)
    .sort((a, b) => getCardPosition(b) - getCardPosition(a))

  for (const card of playerCards) {
    if (getCardPosition(card) >= insertIndex) {
      const { error } = await supabase
        .from('player_timeline_cards')
        .update({ position: getCardPosition(card) + 1 })
        .eq('id', card.id)

      if (error) throw error
    }
  }

  const { error } = await supabase.from('player_timeline_cards').insert({
    room_id: roomId,
    player_id: playerId,
    song_id: songId,
    position: insertIndex,
    is_starter: isStarter,
    is_guessed: isGuessed,
    is_revealed: isRevealed,
  })

  if (error) throw error
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
  if (deckError) throw deckError

  const starterRows = state.players.map((player, index) => ({
    room_id: roomId,
    player_id: player.player_id,
    song_id: starterIds[index],
    position: 0,
    is_starter: true,
  }))

  const { error: starterError } = await supabase
    .from('player_timeline_cards')
    .insert(starterRows)
  if (starterError) throw starterError

  await supabase
    .from('room_players')
    .update({ score: 0 })
    .eq('room_id', roomId)

  await supabase.from('rooms').update({ phase: 'playing' }).eq('id', roomId)

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

  if (error) throw error
}

export async function submitOnlineGuess(
  roomId: string,
  turnId: string,
  activePlayerId: string,
  guess: string,
  isCorrect: boolean,
) {
  if (!supabase) throw new Error('Supabase is not configured')

  const state = await fetchRoomState(roomId)
  if (
    state.room.phase !== 'playing' &&
    state.room.phase !== 'challenge' &&
    state.room.phase !== 'placement'
  ) {
    throw new Error('Cannot guess right now')
  }
  if (state.currentTurn?.id !== turnId) {
    throw new Error('Turn has changed')
  }
  if (state.currentTurn.guess !== null) {
    throw new Error('Guess already submitted this turn')
  }

  const { error: turnError } = await supabase
    .from('turns')
    .update({
      guess,
      is_correct: isCorrect,
    })
    .eq('id', turnId)
    .eq('active_player_id', activePlayerId)

  if (turnError) throw turnError

  if (isCorrect) {
    const { data: player } = await supabase
      .from('room_players')
      .select('coins')
      .eq('room_id', roomId)
      .eq('player_id', activePlayerId)
      .single()

    if (player) {
      await supabase
        .from('room_players')
        .update({ coins: player.coins + GUESS_REWARD_COINS })
        .eq('room_id', roomId)
        .eq('player_id', activePlayerId)
    }
  }

  if (state.room.phase === 'placement') {
    await supabase.from('rooms').update({ phase: 'playing' }).eq('id', roomId)
  }
}

export async function submitOnlinePlacement(
  roomId: string,
  turnId: string,
  activePlayerId: string,
  insertIndex: number,
) {
  if (!supabase) throw new Error('Supabase is not configured')

  const state = await fetchRoomState(roomId)
  if (state.room.phase !== 'playing' && state.room.phase !== 'placement') {
    throw new Error('Not in playing phase')
  }
  if (state.currentTurn?.id !== turnId) {
    throw new Error('Turn has changed')
  }
  if (state.currentTurn.active_player_id !== activePlayerId) {
    throw new Error('Only the active player can place the card')
  }

  const timelineLength = buildOrderedSongIds(state.timelineCards, activePlayerId).length
  if (insertIndex < 0 || insertIndex > timelineLength) {
    throw new Error('Invalid timeline position')
  }

  const { error: turnError } = await supabase
    .from('turns')
    .update({ insert_index: insertIndex })
    .eq('id', turnId)
    .eq('active_player_id', activePlayerId)

  if (turnError) throw turnError
  await supabase.from('rooms').update({ phase: 'challenge' }).eq('id', roomId)
}

export async function submitOnlineChallenge(
  roomId: string,
  turnId: string,
  challengerId: string,
) {
  if (!supabase) throw new Error('Supabase is not configured')

  const state = await fetchRoomState(roomId)
  if (state.room.phase !== 'challenge' || !state.currentTurn) {
    throw new Error('Not in challenge phase')
  }
  if (state.currentTurn.id !== turnId) {
    throw new Error('Turn has changed')
  }
  if (state.currentTurn.active_player_id === challengerId) {
    throw new Error('You cannot challenge your own placement')
  }
  if (state.currentTurn.challenger_player_id) {
    throw new Error('This claim was already challenged')
  }

  const challenger = state.players.find((player) => player.player_id === challengerId)
  if (!challenger || challenger.coins < CHALLENGE_COST) {
    throw new Error('Not enough coins to challenge')
  }

  await supabase
    .from('room_players')
    .update({ coins: challenger.coins - CHALLENGE_COST })
    .eq('room_id', roomId)
    .eq('player_id', challengerId)

  const { error: turnError } = await supabase
    .from('turns')
    .update({ challenger_player_id: challengerId })
    .eq('id', turnId)

  if (turnError) throw turnError
}

export async function revealOnlineClaim(roomId: string, turnId: string) {
  if (!supabase) throw new Error('Supabase is not configured')

  const state = await fetchRoomState(roomId)
  if (state.room.phase !== 'challenge' || !state.currentTurn) {
    throw new Error('Not in challenge phase')
  }
  if (state.currentTurn.id !== turnId) {
    throw new Error('Turn has changed')
  }

  const insertIndex = getTurnInsertIndex(state.currentTurn)
  if (insertIndex === null) {
    throw new Error('No placement to reveal')
  }

  const song = state.songs.find((entry) => entry.id === state.currentTurn?.song_id)
  if (!song) throw new Error('Song not found')

  const getReleaseYear = (songId: string) =>
    state.songs.find((entry) => entry.id === songId)?.release_year

  const claimantCards = buildOrderedSongIds(
    state.timelineCards,
    state.currentTurn.active_player_id,
  )

  const placementCorrect = isPlacementCorrect(
    song.release_year,
    claimantCards,
    insertIndex,
    getReleaseYear,
  )

  let awardedTo: string | null = null
  let discarded = false

  if (placementCorrect) {
    awardedTo = state.currentTurn.active_player_id
  } else if (state.currentTurn.challenger_player_id) {
    awardedTo = state.currentTurn.challenger_player_id
  } else {
    discarded = true
  }

  if (awardedTo) {
    let targetInsertIndex = insertIndex

    if (!placementCorrect || awardedTo !== state.currentTurn.active_player_id) {
      const recipientCards = buildOrderedSongIds(state.timelineCards, awardedTo)
      targetInsertIndex = findCorrectInsertIndex(
        song.release_year,
        recipientCards,
        getReleaseYear,
      )
    }

    const guessCorrect = state.currentTurn.is_correct === true
    const revealFromGuess =
      awardedTo === state.currentTurn.active_player_id && guessCorrect

    await insertTimelineCardAt(
      roomId,
      awardedTo,
      song.id,
      targetInsertIndex,
      false,
      revealFromGuess,
      true,
      state.timelineCards,
    )
  }

  await supabase
    .from('turns')
    .update({
      claim_awarded_to: awardedTo,
      claim_discarded: discarded,
      ended_at: new Date().toISOString(),
    })
    .eq('id', turnId)

  await supabase.from('rooms').update({ phase: 'reveal' }).eq('id', roomId)
}

export async function advanceOnlineTurn(roomId: string, hostPlayerId: string) {
  if (!supabase) throw new Error('Supabase is not configured')

  const state = await fetchRoomState(roomId)
  if (state.room.host_player_id !== hostPlayerId) {
    throw new Error('Only the host can advance the turn')
  }

  const currentSongId = state.currentTurn?.song_id
  if (currentSongId) {
    await supabase
      .from('game_deck')
      .update({ played: true })
      .eq('room_id', roomId)
      .eq('song_id', currentSongId)
  }

  const remaining = state.deck.filter((card) => !card.played && card.song_id !== currentSongId)
  if (remaining.length === 0) {
    await supabase.from('rooms').update({ phase: 'finished' }).eq('id', roomId)
    return
  }

  const currentIndex = state.players.findIndex(
    (player) => player.player_id === state.currentTurn?.active_player_id,
  )
  const nextPlayer = state.players[(currentIndex + 1) % state.players.length]
  const nextCard = remaining.sort((a, b) => a.position - b.position)[0]

  await supabase.from('rooms').update({ phase: 'playing' }).eq('id', roomId)
  await createNextTurn(roomId, nextPlayer.player_id, nextCard.song_id)
}

export function mapSongsToLookup(
  songs: DbSong[],
  albums: DbAlbum[] = [],
): Record<string, Song> {
  const albumNames = albums.reduce<Record<string, string>>((acc, album) => {
    acc[album.id] = album.name
    return acc
  }, {})

  return songs.reduce<Record<string, Song>>((acc, song) => {
    acc[song.id] = {
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: albumNames[song.album_id] ?? '',
      audioUrl: song.audio_url,
      releaseYear: song.release_year ?? 2000,
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
    board.revealedSongIds = playerCards.filter((card) => card.is_revealed).map((card) => card.song_id)
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
