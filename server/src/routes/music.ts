import type { Express, Request, Response } from 'express'
import { getSpotifyCatalogUrlError } from '@spot-the-song/shared'
import { resolveMusicImport } from '../music/resolveMusicImport.js'
import { toPreviewResult } from '../music/types.js'
import { parseSpotifyUrl } from '../music/spotifyImport.js'

export function registerMusicRoutes(app: Express): void {
  app.post('/api/music/preview', async (req: Request, res: Response) => {
    try {
      const url = typeof req.body?.url === 'string' ? req.body.url.trim() : ''

      if (!url) {
        return res.status(400).json({ error: 'Paste a Spotify playlist or album link.' })
      }

      if (!parseSpotifyUrl(url)) {
        const message = getSpotifyCatalogUrlError(url) ?? 'Paste a Spotify album or playlist link'
        return res.status(400).json({ error: message })
      }

      const result = await resolveMusicImport(url)
      return res.json(toPreviewResult(result))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Preview failed'
      return res.status(422).json({ error: message })
    }
  })
}
