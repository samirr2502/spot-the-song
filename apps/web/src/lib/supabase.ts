import { createClient, SupabaseClient } from '@supabase/supabase-js'

export type RoomMode = 'local' | 'online'
export type RoomPhase =
  | 'lobby'
  | 'playing'
  | 'placement'
  | 'challenge'
  | 'reveal'
  | 'finished'

export type DbRoom = {
  id: string
  code: string
  host_player_id: string | null
  mode: RoomMode
  phase: RoomPhase
  settings: {
    guessTimeSeconds: number
    maxPlayers?: number
  }
  created_at: string
}

export type DbRoomPlayer = {
  id: string
  room_id: string
  player_id: string
  name: string
  score: number
  turn_order: number
  is_host: boolean
  connected_at: string
  coins: number
}

export type DbAlbum = {
  id: string
  room_id: string
  player_id: string
  name: string
}

export type DbSong = {
  id: string
  album_id: string
  title: string
  artist: string
  audio_url: string
  release_year: number
}

export type DbGameDeck = {
  id: string
  room_id: string
  song_id: string
  position: number
  played: boolean
}

export type DbTurn = {
  id: string
  room_id: string
  active_player_id: string
  song_id: string
  guess: string | null
  is_correct: boolean | null
  started_at: string
  ended_at: string | null
  claimed_slot: number | null
  insert_index?: number | null
  challenger_player_id: string | null
  claim_awarded_to: string | null
  claim_discarded: boolean
}

export type DbTimelineCard = {
  id: string
  room_id: string
  player_id: string
  song_id: string
  slot_index?: number
  position: number
  is_starter: boolean
  is_guessed: boolean
  is_revealed: boolean
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join('')
}

export function getPlayerSessionId(): string {
  const key = 'sts_player_id'
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const id = `player_${Math.random().toString(36).slice(2, 10)}`
  localStorage.setItem(key, id)
  return id
}
