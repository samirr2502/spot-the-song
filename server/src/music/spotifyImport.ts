export type SpotifyResource = { type: 'album' | 'playlist'; id: string }

export type ParsedTrack = {
  trackId: string
  title: string
  artist: string
  album: string
  previewUrl: string | null
  releaseYear: number | null
}

export type SourceData = {
  name: string
  imageUrl: string | null
  tracks: ParsedTrack[]
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const NEXT_DATA_PATTERN =
  /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/

const ENTITY_PATHS = [
  ['props', 'pageProps', 'state', 'data', 'entity'],
  ['props', 'pageProps', 'data', 'entity'],
  ['props', 'pageProps', 'entity'],
] as const

export function parseSpotifyUrl(url: string): SpotifyResource | null {
  const trimmed = url.trim()

  const webMatch = trimmed.match(/open\.spotify\.com\/(album|playlist)\/([a-zA-Z0-9]+)/)
  if (webMatch) {
    return { type: webMatch[1] as SpotifyResource['type'], id: webMatch[2]! }
  }

  const uriMatch = trimmed.match(/spotify:(album|playlist):([a-zA-Z0-9]+)/)
  if (uriMatch) {
    return { type: uriMatch[1] as SpotifyResource['type'], id: uriMatch[2]! }
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

  return JSON.parse(match[1]!) as Record<string, unknown>
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

function parseReleaseYear(value: unknown): number | null {
  if (typeof value !== 'string' || !value.trim()) return null

  const year = Number.parseInt(value.slice(0, 4), 10)
  if (!Number.isFinite(year) || year < 1900 || year > 2100) return null

  return year
}

function getReleaseYearFromRecord(
  record: Record<string, unknown>,
  fallback: number | null = null,
): number | null {
  const direct =
    parseReleaseYear(record.releaseDate) ??
    parseReleaseYear(record.release_date) ??
    parseReleaseYear(record.originalReleaseDate)

  if (direct) return direct

  const album = record.album
  if (album && typeof album === 'object') {
    const albumYear = getReleaseYearFromRecord(album as Record<string, unknown>)
    if (albumYear) return albumYear
  }

  return fallback
}

function getAlbumName(record: Record<string, unknown>, fallback: string): string {
  const album = record.album
  if (album && typeof album === 'object') {
    const name = (album as { name?: string }).name
    if (name) return name
  }
  return fallback
}

function parseTrackListItem(
  track: Record<string, unknown>,
  sourceName: string,
  releaseYearFallback: number | null = null,
): ParsedTrack | null {
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
    audioPreview?.url ?? (typeof track.preview_url === 'string' ? track.preview_url : null)

  return {
    trackId,
    title,
    artist,
    album: getAlbumName(track, sourceName),
    previewUrl,
    releaseYear: getReleaseYearFromRecord(track, releaseYearFallback),
  }
}

function parseTrackEntity(entity: Record<string, unknown>, sourceName: string): ParsedTrack | null {
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

  return {
    trackId,
    title,
    artist,
    album: getAlbumName(entity, sourceName),
    previewUrl,
    releaseYear: getReleaseYearFromRecord(entity),
  }
}

async function getSpotifyToken(clientId: string, clientSecret: string): Promise<string> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    throw new Error(
      'Failed to authenticate with Spotify. Check SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.',
    )
  }

  const data = (await response.json()) as { access_token?: string }
  if (!data.access_token) {
    throw new Error('Spotify authentication returned no token.')
  }

  return data.access_token
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
    release_date: string
    images: Array<{ url: string }>
    tracks: { items: Array<Record<string, unknown>>; next: string | null }
  }

  const album = await spotifyGet<AlbumResponse>(token, `/albums/${albumId}`)
  const albumReleaseYear = parseReleaseYear(album.release_date)
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
    .map((track) => parseTrackListItem(track, album.name, albumReleaseYear))
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
    .map((item) =>
      item.track ? parseTrackListItem(item.track, playlist.name) : null,
    )
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

  const name =
    (typeof entity.name === 'string' && entity.name) ||
    (typeof entity.title === 'string' && entity.title) ||
    'Spotify Import'

  const entityReleaseYear = getReleaseYearFromRecord(entity)

  const tracks = trackList
    .map((track) =>
      track && typeof track === 'object'
        ? parseTrackListItem(track as Record<string, unknown>, name, entityReleaseYear)
        : null,
    )
    .filter((track): track is ParsedTrack => Boolean(track))

  if (tracks.length === 0) return null

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
        ? 'Album links need SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in server/.env. Playlist links may work without them.'
        : 'Could not load this Spotify link',
    )
  }

  const token = await getSpotifyToken(clientId, clientSecret)
  return resource.type === 'album'
    ? fetchAlbumFromApi(token, resource.id)
    : fetchPlaylistFromApi(token, resource.id)
}

async function fetchTrackEmbedDetails(
  trackId: string,
  sourceName: string,
): Promise<{ previewUrl: string | null; releaseYear: number | null }> {
  const data = await fetchEmbedJson(`https://open.spotify.com/embed/track/${trackId}`)
  if (!data) return { previewUrl: null, releaseYear: null }

  const entity = extractEntity(data)
  if (!entity) return { previewUrl: null, releaseYear: null }

  const parsed = parseTrackEntity(entity, sourceName)
  return {
    previewUrl: parsed?.previewUrl ?? null,
    releaseYear: parsed?.releaseYear ?? getReleaseYearFromRecord(entity),
  }
}

async function deezerPreview(
  title: string,
  artist: string,
): Promise<{ preview: string | null; releaseYear: number | null }> {
  const query = encodeURIComponent(`artist:"${artist}" track:"${title}"`)
  const response = await fetch(`https://api.deezer.com/search?q=${query}&limit=1`)
  if (!response.ok) return { preview: null, releaseYear: null }

  const data = (await response.json()) as {
    data?: Array<{ preview?: string; release_date?: string }>
  }
  const match = data.data?.[0]

  return {
    preview: match?.preview ?? null,
    releaseYear: parseReleaseYear(match?.release_date),
  }
}

async function itunesPreview(
  title: string,
  artist: string,
): Promise<{ preview: string | null; releaseYear: number | null }> {
  const term = encodeURIComponent(`${title} ${artist}`)
  const response = await fetch(
    `https://itunes.apple.com/search?term=${term}&entity=song&limit=3`,
  )
  if (!response.ok) return { preview: null, releaseYear: null }

  const data = (await response.json()) as {
    results?: Array<{ previewUrl?: string; releaseDate?: string }>
  }
  const match = data.results?.[0]

  return {
    preview: match?.previewUrl ?? null,
    releaseYear: parseReleaseYear(match?.releaseDate),
  }
}

async function resolveTrackDetails(
  track: ParsedTrack,
): Promise<{ previewUrl: string | null; releaseYear: number }> {
  let previewUrl = track.previewUrl
  let releaseYear = track.releaseYear

  if (!previewUrl || !releaseYear) {
    const embedDetails = await fetchTrackEmbedDetails(track.trackId, track.album)
    previewUrl ??= embedDetails.previewUrl
    releaseYear ??= embedDetails.releaseYear
  }

  if (!previewUrl || !releaseYear) {
    const deezer = await deezerPreview(track.title, track.artist)
    previewUrl ??= deezer.preview
    releaseYear ??= deezer.releaseYear
  }

  if (!previewUrl || !releaseYear) {
    const itunes = await itunesPreview(track.title, track.artist)
    previewUrl ??= itunes.preview
    releaseYear ??= itunes.releaseYear
  }

  return {
    previewUrl,
    releaseYear: releaseYear ?? 2000,
  }
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
      results[current] = await mapper(items[current]!)
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return results
}

export async function importSpotifyUrl(url: string): Promise<SourceData & { resolvedTracks: ParsedTrack[] }> {
  const resource = parseSpotifyUrl(url)
  if (!resource) {
    throw new Error('Paste a Spotify album or playlist link')
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  const source = await fetchSource(resource, clientId, clientSecret)

  const resolved = await mapWithConcurrency(source.tracks, 4, async (track) => {
    const details = await resolveTrackDetails(track)
    return {
      ...track,
      previewUrl: details.previewUrl,
      releaseYear: details.releaseYear,
    }
  })

  return {
    ...source,
    tracks: resolved,
    resolvedTracks: resolved,
  }
}
