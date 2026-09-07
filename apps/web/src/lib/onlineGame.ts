import type { Album, Song } from '@spot-the-song/game-engine'
import { shuffleArray } from '@spot-the-song/game-engine'
import {
  DbAlbum,
  DbGameDeck,
  DbRoom,
  DbRoomPlayer,
  DbSong,
  DbTurn,
  generateRoomCode,
  getPlayerSessionId,
  supabase,
} from './supabase'

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
    })

    if (playerError) throw playerError
  }

  return { room: room as DbRoom, playerId }
}

export async function fetchRoomState(roomId: string) {
  if (!supabase) throw new Error('Supabase is not configured')

  const [roomRes, playersRes, albumsRes, deckRes, turnRes] =
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

  const songIds = shuffleArray(state.songs.map((song) => song.id))
  if (songIds.length === 0 || state.players.length === 0) {
    throw new Error('Need players and songs to start')
  }

  const deckRows = songIds.map((songId, index) => ({
    room_id: roomId,
    song_id: songId,
    position: index,
    played: false,
  }))

  await supabase.from('game_deck').delete().eq('room_id', roomId)
  await supabase.from('turns').delete().eq('room_id', roomId)

  const { error: deckError } = await supabase.from('game_deck').insert(deckRows)
  if (deckError) throw deckError

  await supabase
    .from('room_players')
    .update({ score: 0 })
    .eq('room_id', roomId)

  await supabase.from('rooms').update({ phase: 'playing' }).eq('id', roomId)

  await createNextTurn(roomId, state.players[0].player_id, songIds[0])
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

  const { error: turnError } = await supabase
    .from('turns')
    .update({
      guess,
      is_correct: isCorrect,
      ended_at: new Date().toISOString(),
    })
    .eq('id', turnId)
    .eq('active_player_id', activePlayerId)

  if (turnError) throw turnError

  if (isCorrect) {
    const { data: player } = await supabase
      .from('room_players')
      .select('score')
      .eq('room_id', roomId)
      .eq('player_id', activePlayerId)
      .single()

    if (player) {
      await supabase
        .from('room_players')
        .update({ score: player.score + 1 })
        .eq('room_id', roomId)
        .eq('player_id', activePlayerId)
    }
  }

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
    }
    return acc
  }, {})
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
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}
