import type { Request, Response } from 'express'
import { prisma } from '../utils/prisma'
import {
  issueTokens,
  revokeAllSessions,
  revokeSession,
  rotateRefreshToken,
  signOAuthState,
  verifyOAuthState,
} from '../services/jwtService'
import {
  exchangeCode,
  getDiscordUser,
  getGuildMemberRoles,
  getOAuthUrl,
  syncUserRoles,
} from '../services/discordService'
import { toPublicUser } from '../utils/user'
import type { AuthRequest } from '../middleware/auth'

export function discordAuthUrl(_req: Request, res: Response) {
  try {
    const state = signOAuthState()
    res.json({ url: getOAuthUrl(state) })
  } catch (error) {
    console.error('Discord auth URL error:', error)
    res.status(500).json({ message: 'Не удалось получить ссылку для входа через Discord' })
  }
}

export function discordCallbackRedirect(req: Request, res: Response) {
  const frontend = process.env.FRONTEND_URL || 'http://localhost:5173'
  const { code, state, error } = req.query

  if (error || typeof code !== 'string') {
    const reason = typeof error === 'string' ? error : 'missing_code'
    res.redirect(`${frontend}/auth/discord/callback?error=${encodeURIComponent(reason)}`)
    return
  }

  const params = new URLSearchParams({ code })
  if (typeof state === 'string') {
    params.set('state', state)
  }

  res.redirect(`${frontend}/auth/discord/callback?${params.toString()}`)
}

export async function discordCallback(req: Request, res: Response) {
  try {
    const { code, state } = req.body as { code?: string; state?: string }

    if (!code) {
      res.status(400).json({ message: 'Код авторизации Discord обязателен' })
      return
    }

    if (!state) {
      res.status(400).json({ message: 'OAuth state обязателен' })
      return
    }

    verifyOAuthState(state)

    const tokens = await exchangeCode(code)
    const discordUser = await getDiscordUser(tokens.access_token)
    const discordRoles = await getGuildMemberRoles(discordUser.id, tokens.access_token)

    const user = await prisma.user.upsert({
      where: { discordId: discordUser.id },
      update: {
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        avatar: discordUser.avatar,
        email: discordUser.email,
        discordAccessToken: tokens.access_token,
        discordRefreshToken: tokens.refresh_token,
      },
      create: {
        discordId: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        avatar: discordUser.avatar,
        email: discordUser.email,
        discordAccessToken: tokens.access_token,
        discordRefreshToken: tokens.refresh_token,
      },
    })

    await syncUserRoles(user.id, discordRoles)

    const userWithRoles = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { roles: true },
    })

    const jwtTokens = await issueTokens({
      id: userWithRoles.id,
      discordId: userWithRoles.discordId,
    })

    res.json({
      user: toPublicUser(userWithRoles),
      ...jwtTokens,
    })
  } catch (error) {
    console.error('Discord callback error:', error)
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

    res.json({ user: toPublicUser(user) })
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

    const tokens = await rotateRefreshToken(refreshToken)
    res.json(tokens)
  } catch {
    res.status(401).json({ message: 'Недействительный refresh-токен' })
  }
}

export async function logout(req: AuthRequest, res: Response) {
  try {
    const { refreshToken } = req.body as { refreshToken?: string }

    if (refreshToken) {
      await revokeSession(refreshToken, req.userId)
    } else if (req.userId) {
      await revokeAllSessions(req.userId)
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ message: 'Не удалось выйти из аккаунта' })
  }
}
