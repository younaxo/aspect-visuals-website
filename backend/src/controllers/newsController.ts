import type { Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../utils/prisma'
import type { AuthRequest } from '../middleware/auth'
import {
  AUTHOR_SELECT,
  buildUniqueSlug,
  isNewsStatus,
  NEWS_ORDER,
  publishedWhere,
  serializeNews,
  serializeNewsCard,
} from '../services/newsService'

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function routeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || ''
  return value || ''
}

function parsePaging(req: Request): { page: number; pageSize: number } {
  const page = Math.max(1, Number(req.query.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10))
  return { page, pageSize }
}

/** Публичный список: только опубликованные, закреплённые сверху. */
export async function listPublishedNews(req: Request, res: Response) {
  try {
    const { page, pageSize } = parsePaging(req)
    const where: Prisma.NewsWhereInput = publishedWhere()

    const [total, items] = await Promise.all([
      prisma.news.count({ where }),
      prisma.news.findMany({
        where,
        include: { author: AUTHOR_SELECT },
        orderBy: [...NEWS_ORDER],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    res.json({ total, page, pageSize, news: items.map(serializeNewsCard) })
  } catch (error) {
    console.error('News list error:', error)
    res.status(500).json({ message: 'Не удалось загрузить новости' })
  }
}

export async function getPublishedNews(req: Request, res: Response) {
  try {
    const slug = routeParam(req.params.slug)
    const item = await prisma.news.findFirst({
      where: { slug, ...publishedWhere() },
      include: { author: AUTHOR_SELECT },
    })

    if (!item) {
      res.status(404).json({ message: 'Новость не найдена' })
      return
    }

    res.json({ news: serializeNews(item) })
  } catch (error) {
    console.error('News detail error:', error)
    res.status(500).json({ message: 'Не удалось загрузить новость' })
  }
}

/** Админский список: любые статусы, с поиском. */
export async function listAllNews(req: AuthRequest, res: Response) {
  try {
    const { page, pageSize } = parsePaging(req)
    const search = asString(req.query.search)
    const status = asString(req.query.status).toUpperCase()

    const where: Prisma.NewsWhereInput = {}
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (isNewsStatus(status)) where.status = status

    const [total, items] = await Promise.all([
      prisma.news.count({ where }),
      prisma.news.findMany({
        where,
        include: { author: AUTHOR_SELECT },
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    res.json({ total, page, pageSize, news: items.map(serializeNewsCard) })
  } catch (error) {
    console.error('Admin news list error:', error)
    res.status(500).json({ message: 'Не удалось загрузить новости' })
  }
}

export async function getNewsById(req: AuthRequest, res: Response) {
  const item = await prisma.news.findUnique({
    where: { id: routeParam(req.params.id) },
    include: { author: AUTHOR_SELECT },
  })

  if (!item) {
    res.status(404).json({ message: 'Новость не найдена' })
    return
  }

  res.json({ news: serializeNews(item) })
}

export async function createNews(req: AuthRequest, res: Response) {
  try {
    const title = asString(req.body?.title)
    const content = asString(req.body?.content)

    if (title.length < 3) {
      res.status(400).json({ message: 'Заголовок должен быть не короче 3 символов' })
      return
    }
    if (!content) {
      res.status(400).json({ message: 'Текст новости обязателен' })
      return
    }

    const status = asString(req.body?.status).toUpperCase()
    const resolvedStatus = isNewsStatus(status) ? status : 'DRAFT'

    const item = await prisma.news.create({
      data: {
        title,
        slug: await buildUniqueSlug(title),
        excerpt: asString(req.body?.excerpt) || null,
        content,
        cover: asString(req.body?.cover) || null,
        status: resolvedStatus,
        pinned: req.body?.pinned === true,
        publishedAt: resolvedStatus === 'PUBLISHED' ? new Date() : null,
        authorId: req.userId ?? null,
      },
      include: { author: AUTHOR_SELECT },
    })

    res.status(201).json({ news: serializeNews(item) })
  } catch (error) {
    console.error('Create news error:', error)
    res.status(500).json({ message: 'Не удалось создать новость' })
  }
}

export async function updateNews(req: AuthRequest, res: Response) {
  try {
    const id = routeParam(req.params.id)
    const existing = await prisma.news.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json({ message: 'Новость не найдена' })
      return
    }

    const title = req.body?.title === undefined ? existing.title : asString(req.body.title)
    if (title.length < 3) {
      res.status(400).json({ message: 'Заголовок должен быть не короче 3 символов' })
      return
    }

    const status = asString(req.body?.status).toUpperCase()
    const nextStatus = isNewsStatus(status) ? status : existing.status

    // publishedAt проставляем один раз — при первой публикации
    let publishedAt = existing.publishedAt
    if (nextStatus === 'PUBLISHED' && !publishedAt) publishedAt = new Date()
    if (nextStatus === 'DRAFT') publishedAt = null

    const item = await prisma.news.update({
      where: { id },
      data: {
        title,
        slug: title !== existing.title ? await buildUniqueSlug(title, id) : existing.slug,
        excerpt: req.body?.excerpt === undefined ? undefined : asString(req.body.excerpt) || null,
        content: req.body?.content === undefined ? undefined : asString(req.body.content),
        cover: req.body?.cover === undefined ? undefined : asString(req.body.cover) || null,
        status: nextStatus,
        pinned: typeof req.body?.pinned === 'boolean' ? req.body.pinned : undefined,
        publishedAt,
      },
      include: { author: AUTHOR_SELECT },
    })

    res.json({ news: serializeNews(item) })
  } catch (error) {
    console.error('Update news error:', error)
    res.status(500).json({ message: 'Не удалось обновить новость' })
  }
}

export async function deleteNews(req: AuthRequest, res: Response) {
  try {
    const id = routeParam(req.params.id)
    const existing = await prisma.news.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json({ message: 'Новость не найдена' })
      return
    }

    await prisma.news.delete({ where: { id } })
    res.json({ ok: true })
  } catch (error) {
    console.error('Delete news error:', error)
    res.status(500).json({ message: 'Не удалось удалить новость' })
  }
}
