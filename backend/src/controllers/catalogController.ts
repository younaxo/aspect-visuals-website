import type { Request, Response } from 'express'
import {
  curseforgeConfigured,
  getModrinthFile,
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

const DEFAULT_GAME_VERSION = '1.21.4'

/** Ссылка на файл для установки в лаунчер. */
function handleFile(kind: CatalogKind) {
  return async (req: Request, res: Response) => {
    try {
      const source = asString(req.params.source)
      const id = asString(req.params.id)
      const gameVersion = asString(req.query.gameVersion) || DEFAULT_GAME_VERSION

      if (!id) {
        res.status(400).json({ message: 'Не указан идентификатор проекта' })
        return
      }

      if (source === 'curseforge') {
        res.status(503).json({ message: 'CurseForge в разработке' })
        return
      }

      if (source !== 'modrinth') {
        res.status(400).json({ message: 'Неизвестный источник' })
        return
      }

      res.json({ file: await getModrinthFile(kind, id, gameVersion) })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось получить файл'
      console.error('Catalog file error:', message)
      res.status(404).json({ message })
    }
  }
}

export const modFile = handleFile('mod')
export const resourcePackFile = handleFile('resourcepack')
