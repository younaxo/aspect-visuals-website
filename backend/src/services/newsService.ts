import type { News } from '@prisma/client'
import { prisma } from '../utils/prisma'

export const NEWS_STATUSES = ['DRAFT', 'PUBLISHED'] as const
export type NewsStatus = (typeof NEWS_STATUSES)[number]

export function isNewsStatus(value: string): value is NewsStatus {
  return (NEWS_STATUSES as readonly string[]).includes(value)
}

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .split('')
    .map((char) => TRANSLIT[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  return base || 'news'
}

/** Подбирает свободный slug, добавляя суффикс при конфликте. */
export async function buildUniqueSlug(title: string, ignoreId?: string): Promise<string> {
  const base = slugify(title)

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`
    const existing = await prisma.news.findUnique({ where: { slug: candidate } })
    if (!existing || existing.id === ignoreId) return candidate
  }

  return `${base}-${Date.now().toString(36)}`
}

type NewsWithAuthor = News & { author?: { id: string; username: string; avatar: string | null } | null }

export function serializeNews(item: NewsWithAuthor) {
  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    excerpt: item.excerpt,
    content: item.content,
    cover: item.cover,
    status: item.status,
    pinned: item.pinned,
    publishedAt: item.publishedAt ? item.publishedAt.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    author: item.author ? { id: item.author.id, username: item.author.username, avatar: item.author.avatar } : null,
  }
}

/** Краткая карточка для списков — без тяжёлого поля content. */
export function serializeNewsCard(item: NewsWithAuthor) {
  const { content: _content, ...card } = serializeNews(item)
  return card
}

export const PUBLISHED_WHERE = {
  status: 'PUBLISHED',
  publishedAt: { not: null, lte: new Date() },
} as const

export const NEWS_ORDER = [{ pinned: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }] as const

export const AUTHOR_SELECT = { select: { id: true, username: true, avatar: true } } as const
