import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

type SpotifyResource = { type: 'album' | 'playlist'; id: string }

type ImportSong = {
  title: string
  artist: string
  audioUrl: string
}

type ImportResponse = {
  name: string
  imageUrl: string | null
  songs: ImportSong[]
  skippedCount: number
}

type ParsedTrack = {
  trackId: string
  title: string
  artist: string
  previewUrl: string | null
}

type SourceData = {
  name: string
  imageUrl: string | null
  tracks: ParsedTrack[]
}

const NEXT_DATA_PATTERN =
  /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/

const ENTITY_PATHS = [
  ['props', 'pageProps', 'state', 'data', 'entity'],
  ['props', 'pageProps', 'data', 'entity'],
  ['props', 'pageProps', 'entity'],
] as const

function parseSpotifyUrl(url: string): SpotifyResource | null {
  const trimmed = url.trim()

  const webMatch = trimmed.match(/open\.spotify\.com\/(album|playlist)\/([a-zA-Z0-9]+)/)
  if (webMatch) {
    return { type: webMatch[1] as SpotifyResource['type'], id: webMatch[2] }
  }

  const uriMatch = trimmed.match(/spotify:(album|playlist):([a-zA-Z0-9]+)/)
  if (uriMatch) {
    return { type: uriMatch[1] as SpotifyResource['type'], id: uriMatch[2] }
  }

  return null
}

function resolvePath(data: Record<string, unknown>, path: readonly string[]): unknown {
  let current: unknown = data
  for (const key of path) {
    if (!current || typeof current !== 'object') return null
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

function deepFindTrackList(data: Record<string, unknown>): Record<string, unknown> | null {
  function walk(node: unknown, depth = 0): Record<string, unknown> | null {
    if (!node || typeof node !== 'object' || depth > 8) return null
    const record = node as Record<string, unknown>
    if (Array.isArray(record.trackList)) return record
    for (const value of Object.values(record)) {
      const found = walk(value, depth + 1)
      if (found) return found
    }
    return null
  }

  return walk(data)
}

function extractEntity(data: Record<string, unknown>): Record<string, unknown> | null {
  for (const path of ENTITY_PATHS) {
    const entity = resolvePath(data, path)
    if (entity && typeof entity === 'object') {
      return entity as Record<string, unknown>
    }
  }

  return deepFindTrackList(data)
}

async function fetchEmbedJson(url: string): Promise<Record<string, unknown> | null> {
  const response = await fetch(url, {
    headers: {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
      'user-agent': USER_AGENT,
    },
  })

  if (!response.ok) return null

  const html = await response.text()
  const match = html.match(NEXT_DATA_PATTERN)
  if (!match) return null

  return JSON.parse(match[1]) as Record<string, unknown>
}

function getCoverUrl(entity: Record<string, unknown>): string | null {
  const coverArt = entity.coverArt as { sources?: Array<{ url?: string }> } | undefined
  const coverFromArt = coverArt?.sources?.at(-1)?.url
  if (coverFromArt) return coverFromArt

  const images = (entity.visualIdentity as { image?: Array<{ url?: string }> } | undefined)?.image
  return images?.at(-1)?.url ?? null
}

function formatArtists(artists: unknown): string {
  if (typeof artists === 'string') return artists
  if (!Array.isArray(artists)) return ''

  return artists
    .map((entry) => (entry && typeof entry === 'object' ? (entry as { name?: string }).name : ''))
    .filter(Boolean)
    .join(', ')
}

function parseTrackListItem(track: Record<string, unknown>): ParsedTrack | null {
  const uri = typeof track.uri === 'string' ? track.uri : ''
  const trackId =
    (typeof track.id === 'string' && track.id) ||
    (uri.startsWith('spotify:track:') ? uri.split(':').pop() ?? '' : '')
  if (!trackId) return null

  const title =
    (typeof track.title === 'string' && track.title) ||
    (typeof track.name === 'string' && track.name) ||
    'Unknown Track'

  const artist =
    (typeof track.subtitle === 'string' && track.subtitle) || formatArtists(track.artists)

  const audioPreview = track.audioPreview as { url?: string } | undefined
  const previewUrl =
    audioPreview?.url ??
    (typeof track.preview_url === 'string' ? track.preview_url : null)

  return { trackId, title, artist, previewUrl }
}

function parseTrackEntity(entity: Record<string, unknown>): ParsedTrack | null {
  const uri = typeof entity.uri === 'string' ? entity.uri : ''
  const trackId =
    (typeof entity.id === 'string' && entity.id) ||
    (uri.startsWith('spotify:track:') ? uri.split(':').pop() ?? '' : '')
  if (!trackId) return null

  const title =
    (typeof entity.title === 'string' && entity.title) ||
    (typeof entity.name === 'string' && entity.name) ||
    'Unknown Track'

  const artist =
    (typeof entity.subtitle === 'string' && entity.subtitle) || formatArtists(entity.artists)

  const audioPreview = entity.audioPreview as { url?: string } | undefined
  const previewUrl = audioPreview?.url ?? null

  return { trackId, title, artist, previewUrl }
}

async function getSpotifyToken(clientId: string, clientSecret: string): Promise<string> {
  const credentials = btoa(`${clientId}:${clientSecret}`)
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    throw new Error('Failed to authenticate with Spotify. Check SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.')
  }

  const data = await response.json()
  return data.access_token as string
}

async function spotifyGet<T>(token: string, path: string): Promise<T> {
  const response = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    const message = response.status === 404 ? 'Spotify link not found' : 'Spotify request failed'
    throw new Error(message)
  }

  return response.json() as Promise<T>
}

async function fetchAlbumFromApi(token: string, albumId: string): Promise<SourceData> {
  type AlbumResponse = {
    name: string
    images: Array<{ url: string }>
    tracks: { items: Array<Record<string, unknown>>; next: string | null }
  }

  const album = await spotifyGet<AlbumResponse>(token, `/albums/${albumId}`)
  const items = [...album.tracks.items]
  let next = album.tracks.next

  while (next) {
    const page = await fetch(next, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((response) =>
      response.json() as Promise<{ items: Array<Record<string, unknown>>; next: string | null }>,
    )
    items.push(...page.items)
    next = page.next
  }

  const tracks = items
    .map((track) => parseTrackListItem(track))
    .filter((track): track is ParsedTrack => Boolean(track))

  return {
    name: album.name,
    imageUrl: album.images[0]?.url ?? null,
    tracks,
  }
}

async function fetchPlaylistFromApi(token: string, playlistId: string): Promise<SourceData> {
  type PlaylistResponse = {
    name: string
    images: Array<{ url: string }>
    tracks: {
      items: Array<{ track: Record<string, unknown> | null }>
      next: string | null
    }
  }

  const playlist = await spotifyGet<PlaylistResponse>(token, `/playlists/${playlistId}`)
  const items = [...playlist.tracks.items]
  let next = playlist.tracks.next

  while (next) {
    const page = await fetch(next, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((response) =>
      response.json() as Promise<{
        items: Array<{ track: Record<string, unknown> | null }>
        next: string | null
      }>,
    )
    items.push(...page.items)
    next = page.next
  }

  const tracks = items
    .map((item) => (item.track ? parseTrackListItem(item.track) : null))
    .filter((track): track is ParsedTrack => Boolean(track))

  return {
    name: playlist.name,
    imageUrl: playlist.images[0]?.url ?? null,
    tracks,
  }
}

async function fetchFromEmbed(resource: SpotifyResource): Promise<SourceData | null> {
  const embedUrl =
    resource.type === 'album'
      ? `https://open.spotify.com/embed/album/${resource.id}`
      : `https://open.spotify.com/embed/playlist/${resource.id}`

  const data = await fetchEmbedJson(embedUrl)
  if (!data) return null

  const entity = extractEntity(data)
  if (!entity || entity.status === 404) return null

  const trackList = entity.trackList
  if (!Array.isArray(trackList) || trackList.length === 0) return null

  const tracks = trackList
    .map((track) =>
      track && typeof track === 'object' ? parseTrackListItem(track as Record<string, unknown>) : null,
    )
    .filter((track): track is ParsedTrack => Boolean(track))

  if (tracks.length === 0) return null

  const name =
    (typeof entity.name === 'string' && entity.name) ||
    (typeof entity.title === 'string' && entity.title) ||
    'Spotify Import'

  return {
    name,
    imageUrl: getCoverUrl(entity),
    tracks,
  }
}

async function fetchSource(
  resource: SpotifyResource,
  clientId: string | undefined,
  clientSecret: string | undefined,
): Promise<SourceData> {
  const embedSource = await fetchFromEmbed(resource)
  if (embedSource) return embedSource

  if (!clientId || !clientSecret) {
    throw new Error(
      resource.type === 'album'
        ? 'Album links need Spotify API credentials in Supabase secrets (SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET). Playlist links may work without them.'
        : 'Could not load this Spotify link',
    )
  }

  const token = await getSpotifyToken(clientId, clientSecret)
  return resource.type === 'album'
    ? fetchAlbumFromApi(token, resource.id)
    : fetchPlaylistFromApi(token, resource.id)
}

async function fetchTrackEmbedPreview(trackId: string): Promise<string | null> {
  const data = await fetchEmbedJson(`https://open.spotify.com/embed/track/${trackId}`)
  if (!data) return null

  const entity = extractEntity(data)
  if (!entity) return null

  const parsed = parseTrackEntity(entity)
  return parsed?.previewUrl ?? null
}

async function deezerPreview(title: string, artist: string): Promise<string | null> {
  const query = encodeURIComponent(`artist:"${artist}" track:"${title}"`)
  const response = await fetch(`https://api.deezer.com/search?q=${query}&limit=1`)
  if (!response.ok) return null

  const data = await response.json() as { data?: Array<{ preview?: string }> }
  return data.data?.[0]?.preview ?? null
}

async function itunesPreview(title: string, artist: string): Promise<string | null> {
  const term = encodeURIComponent(`${title} ${artist}`)
  const response = await fetch(
    `https://itunes.apple.com/search?term=${term}&entity=song&limit=3`,
  )
  if (!response.ok) return null

  const data = await response.json() as { results?: Array<{ previewUrl?: string }> }
  return data.results?.[0]?.previewUrl ?? null
}

async function resolvePreviewUrl(track: ParsedTrack): Promise<string | null> {
  if (track.previewUrl) return track.previewUrl

  const embedPreview = await fetchTrackEmbedPreview(track.trackId)
  if (embedPreview) return embedPreview

  const deezer = await deezerPreview(track.title, track.artist)
  if (deezer) return deezer

  return itunesPreview(track.title, track.artist)
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let index = 0

  async function worker() {
    while (index < items.length) {
      const current = index
      index += 1
      results[current] = await mapper(items[current])
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return results
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const clientId = Deno.env.get('SPOTIFY_CLIENT_ID')
    const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET')

    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing Spotify URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resource = parseSpotifyUrl(url)
    if (!resource) {
      return new Response(
        JSON.stringify({ error: 'Paste a Spotify album or playlist link' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const source = await fetchSource(resource, clientId ?? undefined, clientSecret ?? undefined)
    const resolved = await mapWithConcurrency(source.tracks, 4, async (track) => ({
      track,
      audioUrl: await resolvePreviewUrl(track),
    }))

    const songs: ImportSong[] = []
    let skippedCount = 0

    for (const entry of resolved) {
      if (entry.audioUrl) {
        songs.push({
          title: entry.track.title,
          artist: entry.track.artist,
          audioUrl: entry.audioUrl,
        })
      } else {
        skippedCount += 1
      }
    }

    if (songs.length === 0) {
      return new Response(
        JSON.stringify({
          error: `Found ${source.tracks.length} tracks but none had a playable preview. Try another album or playlist.`,
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const payload: ImportResponse = {
      name: source.name,
      imageUrl: source.imageUrl,
      songs,
      skippedCount,
    }

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
