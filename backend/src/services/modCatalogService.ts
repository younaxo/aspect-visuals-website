/**
 * Каталог модов и ресурспаков.
 * Backend ходит в официальные API Modrinth и CurseForge, а не парсит их страницы:
 * ключ CurseForge остаётся на сервере, ответы кэшируются, лаунчер знает только наш API.
 */

export type CatalogKind = 'mod' | 'resourcepack'
export type CatalogSource = 'modrinth' | 'curseforge'

export interface CatalogItem {
  id: string
  source: CatalogSource
  name: string
  description: string
  author: string | null
  iconUrl: string | null
  downloads: number
  pageUrl: string | null
}

const MODRINTH_API = 'https://api.modrinth.com/v2'
const CURSEFORGE_API = 'https://api.curseforge.com/v1'

// CurseForge: 6 = Mods, 12 = Resource Packs (gameId 432 — Minecraft)
const CURSEFORGE_GAME_ID = 432
const CURSEFORGE_CLASS_ID: Record<CatalogKind, number> = { mod: 6, resourcepack: 12 }
const MODRINTH_PROJECT_TYPE: Record<CatalogKind, string> = { mod: 'mod', resourcepack: 'resourcepack' }

const USER_AGENT = 'AspectVisuals/1.0 (+https://aspectvisuals.su)'
const REQUEST_TIMEOUT_MS = 8000
const CACHE_TTL_MS = 5 * 60 * 1000

interface CacheEntry {
  expiresAt: number
  items: CatalogItem[]
}

const cache = new Map<string, CacheEntry>()

export function curseforgeConfigured(): boolean {
  return (process.env.CURSEFORGE_API_KEY || '').trim().length > 10
}

function cacheKey(kind: CatalogKind, source: string, query: string, limit: number): string {
  return `${source}:${kind}:${limit}:${query.toLowerCase()}`
}

function truncate(value: unknown, max = 300): string {
  const text = typeof value === 'string' ? value : ''
  return text.length > max ? `${text.slice(0, max)}…` : text
}

async function fetchJson(url: string, headers: Record<string, string>): Promise<unknown> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, ...headers },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Каталог вернул ${response.status}`)
  }

  return response.json()
}

interface ModrinthHit {
  project_id?: string
  slug?: string
  title?: string
  description?: string
  author?: string
  icon_url?: string | null
  downloads?: number
}

async function searchModrinth(kind: CatalogKind, query: string, limit: number): Promise<CatalogItem[]> {
  const facets = JSON.stringify([[`project_type:${MODRINTH_PROJECT_TYPE[kind]}`]])
  const params = new URLSearchParams({ limit: String(limit), facets })
  if (query) params.set('query', query)

  const data = (await fetchJson(`${MODRINTH_API}/search?${params.toString()}`, {})) as { hits?: ModrinthHit[] }

  return (data.hits ?? []).map((hit) => ({
    id: String(hit.project_id ?? hit.slug ?? ''),
    source: 'modrinth' as const,
    name: String(hit.title ?? 'Без названия'),
    description: truncate(hit.description),
    author: hit.author ? String(hit.author) : null,
    iconUrl: hit.icon_url ?? null,
    downloads: Number(hit.downloads ?? 0),
    pageUrl: hit.slug ? `https://modrinth.com/${MODRINTH_PROJECT_TYPE[kind]}/${hit.slug}` : null,
  }))
}

interface CurseForgeMod {
  id?: number
  name?: string
  summary?: string
  downloadCount?: number
  logo?: { thumbnailUrl?: string; url?: string } | null
  authors?: Array<{ name?: string }>
  links?: { websiteUrl?: string } | null
}

async function searchCurseForge(kind: CatalogKind, query: string, limit: number): Promise<CatalogItem[]> {
  const key = (process.env.CURSEFORGE_API_KEY || '').trim()
  if (!key) return []

  const params = new URLSearchParams({
    gameId: String(CURSEFORGE_GAME_ID),
    classId: String(CURSEFORGE_CLASS_ID[kind]),
    pageSize: String(limit),
    sortField: '2',
    sortOrder: 'desc',
  })
  if (query) params.set('searchFilter', query)

  const data = (await fetchJson(`${CURSEFORGE_API}/mods/search?${params.toString()}`, {
    'x-api-key': key,
  })) as { data?: CurseForgeMod[] }

  return (data.data ?? []).map((mod) => ({
    id: String(mod.id ?? ''),
    source: 'curseforge' as const,
    name: String(mod.name ?? 'Без названия'),
    description: truncate(mod.summary),
    author: mod.authors?.[0]?.name ? String(mod.authors[0].name) : null,
    iconUrl: mod.logo?.thumbnailUrl ?? mod.logo?.url ?? null,
    downloads: Number(mod.downloadCount ?? 0),
    pageUrl: mod.links?.websiteUrl ?? null,
  }))
}

export interface CatalogFile {
  url: string
  filename: string
  sha1: string | null
  size: number | null
  versionName: string | null
  gameVersions: string[]
}

interface ModrinthFile {
  url?: string
  filename?: string
  size?: number
  primary?: boolean
  hashes?: { sha1?: string }
}

interface ModrinthVersion {
  name?: string
  version_number?: string
  game_versions?: string[]
  loaders?: string[]
  date_published?: string
  files?: ModrinthFile[]
}

/**
 * Возвращает файл для установки: последняя версия проекта,
 * подходящая под версию игры и загрузчик.
 */
export async function getModrinthFile(
  kind: CatalogKind,
  projectId: string,
  gameVersion: string,
): Promise<CatalogFile> {
  const params = new URLSearchParams({ game_versions: JSON.stringify([gameVersion]) })
  // Ресурспаки в Modrinth помечены загрузчиком minecraft, моды — fabric
  params.set('loaders', JSON.stringify(kind === 'mod' ? ['fabric'] : ['minecraft']))

  const url = `${MODRINTH_API}/project/${encodeURIComponent(projectId)}/version?${params.toString()}`
  const versions = (await fetchJson(url, {})) as ModrinthVersion[]

  if (!Array.isArray(versions) || versions.length === 0) {
    throw new Error(`Нет версии для Minecraft ${gameVersion}`)
  }

  // Список уже отсортирован от новых к старым
  for (const version of versions) {
    const file = (version.files || []).find((f) => f.primary) || (version.files || [])[0]
    if (file?.url && file.filename) {
      return {
        url: file.url,
        filename: file.filename,
        sha1: file.hashes?.sha1 ?? null,
        size: typeof file.size === 'number' ? file.size : null,
        versionName: version.version_number || version.name || null,
        gameVersions: version.game_versions || [],
      }
    }
  }

  throw new Error('У версии нет файла для скачивания')
}

export interface CatalogResult {
  items: CatalogItem[]
  sources: Array<{ source: CatalogSource; ok: boolean; message?: string }>
}

export async function searchCatalog(
  kind: CatalogKind,
  source: CatalogSource | 'all',
  query: string,
  limit: number,
): Promise<CatalogResult> {
  const wanted: CatalogSource[] = source === 'all' ? ['modrinth', 'curseforge'] : [source]
  const sources: CatalogResult['sources'] = []
  const items: CatalogItem[] = []

  await Promise.all(
    wanted.map(async (name) => {
      if (name === 'curseforge' && !curseforgeConfigured()) {
        sources.push({ source: name, ok: false, message: 'CurseForge не настроен: нет CURSEFORGE_API_KEY' })
        return
      }

      const key = cacheKey(kind, name, query, limit)
      const cached = cache.get(key)
      if (cached && cached.expiresAt > Date.now()) {
        items.push(...cached.items)
        sources.push({ source: name, ok: true })
        return
      }

      try {
        const found = name === 'modrinth'
          ? await searchModrinth(kind, query, limit)
          : await searchCurseForge(kind, query, limit)

        cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, items: found })
        items.push(...found)
        sources.push({ source: name, ok: true })
      } catch (error) {
        // Недоступность одного каталога не должна ронять весь ответ
        const message = error instanceof Error ? error.message : 'неизвестная ошибка'
        console.error(`Catalog ${name} error:`, message)
        sources.push({ source: name, ok: false, message: `${name} временно недоступен` })
      }
    }),
  )

  items.sort((a, b) => b.downloads - a.downloads)
  return { items: items.slice(0, limit), sources }
}
