import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-player-id',
}

const STARTING_COINS = 3
const CHALLENGE_COST = 1
const GUESS_REWARD_COINS = 1

type GameAction =
  | 'guess'
  | 'placement'
  | 'challenge'
  | 'reveal'
  | 'advance'

function normalizeGuess(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['']/g, "'")
    .replace(/[^\w\s']/g, '')
    .replace(/\s+/g, ' ')
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b.charAt(i - 1) === a.charAt(j - 1)
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
    }
  }
  return matrix[b.length][a.length]
}

function isFuzzyMatch(guess: string, target: string): boolean {
  if (!guess || !target) return false
  if (guess === target) return true
  if (guess.length < 3) return false
  const maxLen = Math.max(guess.length, target.length)
  const distance = levenshtein(guess, target)
  const similarity = 1 - distance / maxLen
  if (maxLen <= 5) return distance <= 1
  if (maxLen <= 10) return distance <= 2 || similarity >= 0.85
  return similarity >= 0.88
}

function isGuessCorrect(guess: string, title: string, artist: string): boolean {
  const normalized = normalizeGuess(guess)
  if (!normalized) return false
  const answers = [normalizeGuess(title), normalizeGuess(artist)]
  return answers.some((answer) => isFuzzyMatch(normalized, answer))
}

function isPlacementCorrect(
  releaseYear: number,
  timeline: string[],
  insertIndex: number,
  getYear: (id: string) => number | undefined,
): boolean {
  const index = Math.max(0, Math.min(insertIndex, timeline.length))
  const before = index > 0 ? getYear(timeline[index - 1]) : undefined
  const after = index < timeline.length ? getYear(timeline[index]) : undefined
  if (before !== undefined && releaseYear < before) return false
  if (after !== undefined && releaseYear > after) return false
  return true
}

function findCorrectInsertIndex(
  releaseYear: number,
  timeline: string[],
  getYear: (id: string) => number | undefined,
): number {
  for (let i = 0; i <= timeline.length; i++) {
    if (isPlacementCorrect(releaseYear, timeline, i, getYear)) return i
  }
  return timeline.length
}

function getCardPosition(card: { position?: number; slot_index?: number }) {
  return card.position ?? card.slot_index ?? 0
}

function buildOrderedSongIds(
  cards: Array<{ player_id: string; song_id: string; position?: number; slot_index?: number }>,
  playerId: string,
) {
  return cards
    .filter((c) => c.player_id === playerId)
    .sort((a, b) => getCardPosition(a) - getCardPosition(b))
    .map((c) => c.song_id)
}

async function insertTimelineCardAt(
  supabase: ReturnType<typeof createClient>,
  roomId: string,
  playerId: string,
  songId: string,
  insertIndex: number,
  isStarter = false,
  isGuessed = false,
  isRevealed = false,
  existingCards: Array<{ id: string; player_id: string; position?: number; slot_index?: number }> = [],
) {
  const playerCards = existingCards
    .filter((c) => c.player_id === playerId)
    .sort((a, b) => getCardPosition(b) - getCardPosition(a))

  for (const card of playerCards) {
    if (getCardPosition(card) >= insertIndex) {
      await supabase
        .from('player_timeline_cards')
        .update({ position: getCardPosition(card) + 1 })
        .eq('id', card.id)
    }
  }

  await supabase.from('player_timeline_cards').insert({
    room_id: roomId,
    player_id: playerId,
    song_id: songId,
    position: insertIndex,
    is_starter: isStarter,
    is_guessed: isGuessed,
    is_revealed: isRevealed,
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const { action, roomId, playerId, payload } = await req.json() as {
      action: GameAction
      roomId: string
      playerId: string
      payload: {
        turnId?: string
        guess?: string
        insertIndex?: number
        challengerId?: string
      }
    }

    if (!action || !roomId || !playerId) {
      return json({ error: 'Missing action, roomId, or playerId' }, 400)
    }

    const { data: room } = await supabase.from('rooms').select('*').eq('id', roomId).single()
    if (!room) return json({ error: 'Room not found' }, 404)

    const { data: players } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', roomId)

    const { data: turns } = await supabase
      .from('turns')
      .select('*')
      .eq('room_id', roomId)
      .order('started_at', { ascending: false })
      .limit(1)

    const currentTurn = turns?.[0] ?? null
    const turnId = payload.turnId ?? currentTurn?.id

    switch (action) {
      case 'guess': {
        if (!turnId || !payload.guess) return json({ error: 'Missing turnId or guess' }, 400)
        if (currentTurn?.id !== turnId) return json({ error: 'Turn has changed' }, 400)
        if (currentTurn.active_player_id !== playerId) {
          return json({ error: 'Only active player can guess' }, 403)
        }
        if (currentTurn.guess !== null) return json({ error: 'Already guessed' }, 400)

        const { data: song } = await supabase
          .from('songs')
          .select('title, artist')
          .eq('id', currentTurn.song_id)
          .single()

        if (!song) return json({ error: 'Song not found' }, 404)

        const correct = isGuessCorrect(payload.guess, song.title, song.artist)

        await supabase
          .from('turns')
          .update({ guess: payload.guess, is_correct: correct })
          .eq('id', turnId)

        if (correct) {
          const player = players?.find((p) => p.player_id === playerId)
          if (player) {
            await supabase
              .from('room_players')
              .update({ coins: (player.coins ?? STARTING_COINS) + GUESS_REWARD_COINS })
              .eq('room_id', roomId)
              .eq('player_id', playerId)
          }
        }

        return json({ ok: true, correct })
      }

      case 'placement': {
        if (!turnId || payload.insertIndex === undefined) {
          return json({ error: 'Missing turnId or insertIndex' }, 400)
        }
        if (currentTurn?.id !== turnId) return json({ error: 'Turn has changed' }, 400)
        if (currentTurn.active_player_id !== playerId) {
          return json({ error: 'Only active player can place' }, 403)
        }

        const { data: timelineCards } = await supabase
          .from('player_timeline_cards')
          .select('*')
          .eq('room_id', roomId)

        const timelineLength = buildOrderedSongIds(timelineCards ?? [], playerId).length
        if (payload.insertIndex < 0 || payload.insertIndex > timelineLength) {
          return json({ error: 'Invalid position' }, 400)
        }

        await supabase
          .from('turns')
          .update({ insert_index: payload.insertIndex })
          .eq('id', turnId)

        await supabase.from('rooms').update({ phase: 'challenge' }).eq('id', roomId)
        return json({ ok: true })
      }

      case 'challenge': {
        const challengerId = payload.challengerId ?? playerId
        if (!turnId) return json({ error: 'Missing turnId' }, 400)
        if (room.phase !== 'challenge') return json({ error: 'Not in challenge phase' }, 400)
        if (currentTurn?.active_player_id === challengerId) {
          return json({ error: 'Cannot challenge own placement' }, 400)
        }
        if (currentTurn?.challenger_player_id) {
          return json({ error: 'Already challenged' }, 400)
        }

        const challenger = players?.find((p) => p.player_id === challengerId)
        if (!challenger || (challenger.coins ?? 0) < CHALLENGE_COST) {
          return json({ error: 'Not enough coins' }, 400)
        }

        await supabase
          .from('room_players')
          .update({ coins: (challenger.coins ?? 0) - CHALLENGE_COST })
          .eq('room_id', roomId)
          .eq('player_id', challengerId)

        await supabase
          .from('turns')
          .update({ challenger_player_id: challengerId })
          .eq('id', turnId)

        return json({ ok: true })
      }

      case 'reveal': {
        if (!turnId || !currentTurn) return json({ error: 'No active turn' }, 400)
        if (room.phase !== 'challenge') return json({ error: 'Not in challenge phase' }, 400)

        const insertIndex = currentTurn.insert_index ?? currentTurn.claimed_slot
        if (insertIndex === null || insertIndex === undefined) {
          return json({ error: 'No placement to reveal' }, 400)
        }

        const { data: songs } = await supabase.from('songs').select('*')
        const song = songs?.find((s) => s.id === currentTurn.song_id)
        if (!song) return json({ error: 'Song not found' }, 404)

        const { data: timelineCards } = await supabase
          .from('player_timeline_cards')
          .select('*')
          .eq('room_id', roomId)

        const getYear = (songId: string) =>
          songs?.find((s) => s.id === songId)?.release_year as number | undefined

        const claimantCards = buildOrderedSongIds(timelineCards ?? [], currentTurn.active_player_id)
        const placementCorrect = isPlacementCorrect(
          song.release_year,
          claimantCards,
          insertIndex,
          getYear,
        )

        let awardedTo: string | null = null
        let discarded = false

        if (placementCorrect) {
          awardedTo = currentTurn.active_player_id
        } else if (currentTurn.challenger_player_id) {
          awardedTo = currentTurn.challenger_player_id
        } else {
          discarded = true
        }

        if (awardedTo) {
          let targetIndex = insertIndex
          if (!placementCorrect || awardedTo !== currentTurn.active_player_id) {
            const recipientCards = buildOrderedSongIds(timelineCards ?? [], awardedTo)
            targetIndex = findCorrectInsertIndex(song.release_year, recipientCards, getYear)
          }

          const guessCorrect = currentTurn.is_correct === true
          const isGuessed =
            placementCorrect && guessCorrect && awardedTo === currentTurn.active_player_id

          await insertTimelineCardAt(
            supabase,
            roomId,
            awardedTo,
            song.id,
            targetIndex,
            false,
            isGuessed,
            true,
            timelineCards ?? [],
          )

          if (isGuessed) {
            const player = players?.find((p) => p.player_id === awardedTo)
            if (player) {
              await supabase
                .from('room_players')
                .update({ score: (player.score ?? 0) + 1 })
                .eq('room_id', roomId)
                .eq('player_id', awardedTo)
            }
          }
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
        return json({ ok: true, awardedTo, discarded, placementCorrect })
      }

      case 'advance': {
        if (room.host_player_id !== playerId) {
          return json({ error: 'Only host can advance' }, 403)
        }
        if (room.phase !== 'reveal') return json({ error: 'Not in reveal phase' }, 400)

        const currentSongId = currentTurn?.song_id
        if (currentSongId) {
          await supabase
            .from('game_deck')
            .update({ played: true })
            .eq('room_id', roomId)
            .eq('song_id', currentSongId)
        }

        const { data: deck } = await supabase
          .from('game_deck')
          .select('*')
          .eq('room_id', roomId)

        const remaining = (deck ?? []).filter(
          (c) => !c.played && c.song_id !== currentSongId,
        )

        if (remaining.length === 0) {
          await supabase.from('rooms').update({ phase: 'finished' }).eq('id', roomId)
          return json({ ok: true, finished: true })
        }

        const sortedPlayers = (players ?? []).sort((a, b) => a.turn_order - b.turn_order)
        const currentIndex = sortedPlayers.findIndex(
          (p) => p.player_id === currentTurn?.active_player_id,
        )
        const nextPlayer = sortedPlayers[(currentIndex + 1) % sortedPlayers.length]
        const nextCard = remaining.sort((a, b) => a.position - b.position)[0]

        await supabase.from('rooms').update({ phase: 'playing' }).eq('id', roomId)
        await supabase.from('turns').insert({
          room_id: roomId,
          active_player_id: nextPlayer.player_id,
          song_id: nextCard.song_id,
          guess: null,
          is_correct: null,
          started_at: new Date().toISOString(),
        })

        return json({ ok: true })
      }

      default:
        return json({ error: 'Unknown action' }, 400)
    }
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Internal error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
