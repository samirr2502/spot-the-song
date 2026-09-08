export type SpotifyCatalogResource = { type: 'album' | 'playlist'; id: string }

export function parseSpotifyCatalogUrl(url: string): SpotifyCatalogResource | null {
  const trimmed = url.trim()

  const webMatch = trimmed.match(/open\.spotify\.com\/(album|playlist)\/([a-zA-Z0-9]+)/i)
  if (webMatch) {
    return { type: webMatch[1]!.toLowerCase() as SpotifyCatalogResource['type'], id: webMatch[2]! }
  }

  const uriMatch = trimmed.match(/spotify:(album|playlist):([a-zA-Z0-9]+)/i)
  if (uriMatch) {
    return { type: uriMatch[1]!.toLowerCase() as SpotifyCatalogResource['type'], id: uriMatch[2]! }
  }

  return null
}

/** Returns a user-facing error, or null if the URL is valid for catalog import. */
export function getSpotifyCatalogUrlError(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  if (parseSpotifyCatalogUrl(trimmed)) return null

  if (/open\.spotify\.com\/track\//i.test(trimmed) || /spotify:track:/i.test(trimmed)) {
    return 'That’s a single track link. Paste a Spotify playlist or album link so the game has multiple songs.'
  }

  if (/open\.spotify\.com\/(artist|show|episode|audiobook)\//i.test(trimmed)) {
    return 'Only Spotify playlist and album links are supported.'
  }

  return 'Paste a Spotify album or playlist link.'
}
