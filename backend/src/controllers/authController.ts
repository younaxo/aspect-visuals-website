import type { Request, Response } from 'express'
import { prisma } from '../utils/prisma'
import { generateTokens, verifyToken } from '../utils/jwt'
import { exchangeCode, getDiscordUser, getGuildMemberRoles, syncUserRoles } from '../services/discordService'
import type { AuthRequest } from '../middleware/auth'

export async function discordAuth(req: Request, res: Response) {
  try {
    const { code } = req.body as { code?: string }

    if (!code) {
      res.status(400).json({ message: 'Код авторизации Discord обязателен' })
      return
    }

    const tokens = await exchangeCode(code)
    const discordUser = await getDiscordUser(tokens.access_token)
    const discordRoles = await getGuildMemberRoles(discordUser.id)

    const user = await prisma.user.upsert({
      where: { discordId: discordUser.id },
      update: {
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        avatar: discordUser.avatar,
        email: discordUser.email,
      },
      create: {
        discordId: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        avatar: discordUser.avatar,
        email: discordUser.email,
      },
      include: { roles: true },
    })

    await syncUserRoles(user.id, discordRoles)

    const userWithRoles = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { roles: true },
    })

    const jwtTokens = generateTokens({
      userId: userWithRoles.id,
      discordId: userWithRoles.discordId,
    })

    res.json({
      user: userWithRoles,
      ...jwtTokens,
    })
  } catch (error) {
    console.error('Discord auth error:', error)
    res.status(401).json({ message: 'Не удалось авторизоваться через Discord' })
  }
}

export async function getMe(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Пользователь не авторизован' })
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { roles: true },
    })

    if (!user) {
      res.status(404).json({ message: 'Пользователь не найден' })
      return
    }

    res.json({ user })
  } catch (error) {
    console.error('Get me error:', error)
    res.status(500).json({ message: 'Не удалось получить данные пользователя' })
  }
}

export async function refresh(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body as { refreshToken?: string }

    if (!refreshToken) {
      res.status(400).json({ message: 'Refresh-токен обязателен' })
      return
    }

    const payload = verifyToken(refreshToken)
    const user = await prisma.user.findUnique({ where: { id: payload.userId } })

    if (!user) {
      res.status(401).json({ message: 'Пользователь не найден' })
      return
    }

    res.json(
      generateTokens({
        userId: user.id,
        discordId: user.discordId,
      }),
    )
  } catch {
    res.status(401).json({ message: 'Недействительный refresh-токен' })
  }
}

export async function logout(_req: Request, res: Response) {
  res.json({ success: true })
}
