import type { Request, Response } from 'express'
import {
  curseforgeConfigured,
  searchCatalog,
  type CatalogKind,
  type CatalogSource,
} from '../services/modCatalogService'

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function parseSource(value: string): CatalogSource | 'all' {
  if (value === 'modrinth' || value === 'curseforge') return value
  return 'all'
}

function handle(kind: CatalogKind) {
  return async (req: Request, res: Response) => {
    try {
      const query = asString(req.query.q).slice(0, 100)
      const source = parseSource(asString(req.query.source))
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))

      const result = await searchCatalog(kind, source, query, limit)

      // Если ни один источник не ответил — это ошибка, а не пустой результат
      if (result.items.length === 0 && result.sources.every((item) => !item.ok)) {
        const message = result.sources.map((item) => item.message).filter(Boolean).join('; ')
        res.status(502).json({ message: message || 'Каталог временно недоступен' })
        return
      }

      res.json({ ...result, curseforgeConfigured: curseforgeConfigured() })
    } catch (error) {
      console.error('Catalog error:', error)
      res.status(500).json({ message: 'Не удалось загрузить каталог' })
    }
  }
}

export const searchMods = handle('mod')
export const searchResourcePacks = handle('resourcepack')
