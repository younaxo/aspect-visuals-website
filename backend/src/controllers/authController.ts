import type { Request, Response } from 'express'
import axios from 'axios'
import bcrypt from 'bcryptjs'
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
  DEFAULT_DISCORD_ROLE_ID,
  exchangeCode,
  getDiscordUser,
  getGuildMemberRoles,
  getOAuthUrl,
  syncUserRoles,
} from '../services/discordService'
import {
  createSecureToken,
  isValidEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  smtpConfigured,
} from '../services/emailService'
import { toPublicUser } from '../utils/user'
import { isCustomMedia } from '../utils/media'
import { ensureUserSettings } from '../utils/settings'
import { ensureUserUid } from '../utils/uid'
import type { AuthRequest } from '../middleware/auth'

const BCRYPT_ROUNDS = 12
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000
const EMAIL_REQUIRED = process.env.REQUIRE_EMAIL_VERIFICATION === 'true'

function requireEmailVerification(): boolean {
  return EMAIL_REQUIRED
}

function parseString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

async function attachDefaultRole(userId: string) {
  const role = await prisma.role.upsert({
    where: { discordId: DEFAULT_DISCORD_ROLE_ID },
    update: { name: 'Default' },
    create: { discordId: DEFAULT_DISCORD_ROLE_ID, name: 'Default' },
  })

  await prisma.user.update({
    where: { id: userId },
    data: { roles: { set: [{ id: role.id }] } },
  })
}

async function loadAuthUser(userId: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { roles: true, settings: true },
  })
}

async function authPayload(userId: string) {
  const user = await loadAuthUser(userId)
  const settings = user.settings ?? (await ensureUserSettings(user.id))
  const uid = await ensureUserUid(user.id, { username: user.username })
  const jwtTokens = await issueTokens({ id: user.id, discordId: user.discordId })

  return {
    user: toPublicUser({ ...user, discriminator: String(uid) }),
    settings,
    ...jwtTokens,
  }
}

function discordError(res: Response, error: unknown, fallback: string) {
  console.error(fallback, error)

  if (axios.isAxiosError(error)) {
    const description =
      (error.response?.data as { error_description?: string; error?: string } | undefined)?.error_description ||
      (error.response?.data as { error?: string } | undefined)?.error
    if (description?.includes('Invalid "code"') || description === 'invalid_grant') {
      res.status(400).json({ message: 'Код Discord уже использован. Попробуйте ещё раз.' })
      return
    }
    res.status(401).json({ message: 'Не удалось обменять код Discord. Попробуйте снова.' })
    return
  }

    const message = error instanceof Error ? error.message : ''
    if (message.includes('jwt expired') || message.includes('Недействительный OAuth')) {
      res.status(400).json({ message: 'Сессия Discord истекла. Начните вход заново.' })
      return
    }
    if (message.includes('recovery mode') || message.includes("Can't reach database")) {
      res.status(503).json({ message: 'База данных временно недоступна. Попробуйте через минуту.' })
      return
    }

    res.status(401).json({ message: fallback })
}

export function discordAuthUrl(req: AuthRequest, res: Response) {
  try {
    const intent = typeof req.query.intent === 'string' ? req.query.intent : 'login'

    if (intent === 'link') {
      if (!req.userId) {
        res.status(401).json({ message: 'Чтобы привязать Discord, войдите в аккаунт' })
        return
      }
      const state = signOAuthState({ purpose: 'link', userId: req.userId })
      res.json({ url: getOAuthUrl(state) })
      return
    }

    const state = signOAuthState({ purpose: 'login' })
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

    const oauth = verifyOAuthState(state)
    if (oauth.purpose === 'link') {
      res.status(400).json({ message: 'Этот код предназначен для привязки Discord, а не для входа' })
      return
    }

    const tokens = await exchangeCode(code)
    const discordUser = await getDiscordUser(tokens.access_token)
    const email = discordUser.email?.toLowerCase() || null

    // Вход через Discord доступен только тем, кто уже привязал его к аккаунту.
    // Новый аккаунт здесь не создаётся и чужой не подхватывается по совпадению email.
    const existingByDiscord = await prisma.user.findUnique({ where: { discordId: discordUser.id } })

    if (!existingByDiscord || !existingByDiscord.discordLinked) {
      res.status(403).json({
        message:
          'Этот Discord не привязан ни к одному аккаунту. Войдите по email и привяжите Discord в настройках профиля.',
      })
      return
    }

    if (existingByDiscord.isDeleted) {
      res.status(403).json({ message: 'Аккаунт удалён' })
      return
    }

    const ban = await prisma.ban.findUnique({ where: { userId: existingByDiscord.id } })
    if (ban && (ban.isPermanent || !ban.expiresAt || ban.expiresAt > new Date())) {
      res.status(403).json({ message: ban.reason ? `Аккаунт заблокирован: ${ban.reason}` : 'Аккаунт заблокирован' })
      return
    }

    const discordRoles = await getGuildMemberRoles(discordUser.id, tokens.access_token)

    const existing = await prisma.user.update({
      where: { id: existingByDiscord.id },
      data: {
        avatar: isCustomMedia(existingByDiscord.avatar) ? existingByDiscord.avatar : discordUser.avatar,
        email: existingByDiscord.email || email,
        discordAccessToken: tokens.access_token,
        discordRefreshToken: tokens.refresh_token,
      },
    })

    await ensureUserSettings(existing.id)
    await ensureUserUid(existing.id, {
      username: existing.username,
      discordUsername: discordUser.username,
    })
    await syncUserRoles(existing.id, discordRoles)

    res.json(await authPayload(existing.id))
  } catch (error) {
    discordError(res, error, 'Не удалось авторизоваться через Discord')
  }
}

export async function register(req: Request, res: Response) {
  try {
    const { assertTurnstile } = await import('../services/turnstileService')
    if (!(await assertTurnstile(req, res))) return

    const email = parseString(req.body?.email).toLowerCase()
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    const username = parseString(req.body?.username)

    if (!isValidEmail(email)) {
      res.status(400).json({ message: 'Укажите корректный email' })
      return
    }

    if (password.length < 6) {
      res.status(400).json({ message: 'Пароль должен быть не короче 6 символов' })
      return
    }

    if (username.length < 3 || username.length > 32) {
      res.status(400).json({ message: 'Имя пользователя должно быть от 3 до 32 символов' })
      return
    }

    const taken = await prisma.user.findUnique({ where: { email } })
    if (taken) {
      res.status(409).json({ message: 'Пользователь с таким email уже зарегистрирован' })
      return
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    const user = await prisma.user.create({
      data: {
        email,
        password: hash,
        username,
        isEmailVerified: !requireEmailVerification(),
      },
    })

    await attachDefaultRole(user.id)
    await ensureUserSettings(user.id)
    await ensureUserUid(user.id, { username })

    const verifyToken = createSecureToken()
    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        token: verifyToken,
        expiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
      },
    })
    // Регистрация не должна падать из-за недоступной почты
    try {
      await sendVerificationEmail(email, verifyToken)
    } catch (mailError) {
      console.error('Не удалось отправить письмо подтверждения:', mailError)
    }

    res.status(201).json(await authPayload(user.id))
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ message: 'Не удалось зарегистрироваться' })
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { assertTurnstile } = await import('../services/turnstileService')
    if (!(await assertTurnstile(req, res))) return

    const email = parseString(req.body?.email).toLowerCase()
    const password = typeof req.body?.password === 'string' ? req.body.password : ''

    if (!isValidEmail(email) || !password) {
      res.status(400).json({ message: 'Укажите email и пароль' })
      return
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.password) {
      res.status(401).json({ message: 'Неверный email или пароль' })
      return
    }

    const ok = await bcrypt.compare(password, user.password)
    if (!ok) {
      res.status(401).json({ message: 'Неверный email или пароль' })
      return
    }

    if (user.isDeleted) {
      res.status(401).json({ message: 'Аккаунт удалён' })
      return
    }

    const ban = await prisma.ban.findUnique({ where: { userId: user.id } })
    if (ban && (ban.isPermanent || !ban.expiresAt || ban.expiresAt > new Date())) {
      res.status(403).json({ message: ban.reason ? `Аккаунт заблокирован: ${ban.reason}` : 'Аккаунт заблокирован' })
      return
    }

    if (requireEmailVerification() && !user.isEmailVerified) {
      res.status(403).json({ message: 'Подтвердите email, чтобы войти' })
      return
    }

    await ensureUserSettings(user.id)
    res.json(await authPayload(user.id))
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Не удалось войти' })
  }
}

export async function linkDiscord(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId
    const code = typeof req.body?.code === 'string' ? req.body.code : typeof req.query.code === 'string' ? req.query.code : ''
    const state = typeof req.body?.state === 'string' ? req.body.state : typeof req.query.state === 'string' ? req.query.state : ''

    if (!userId) {
      res.status(401).json({ message: 'Пользователь не авторизован' })
      return
    }

    if (!code || !state) {
      res.status(400).json({ message: 'Код и state Discord обязательны' })
      return
    }

    const oauth = verifyOAuthState(state)
    if (oauth.purpose !== 'link' || oauth.userId !== userId) {
      res.status(400).json({ message: 'Недействительный запрос на привязку Discord' })
      return
    }

    const tokens = await exchangeCode(code)
    const discordUser = await getDiscordUser(tokens.access_token)

    const taken = await prisma.user.findFirst({
      where: { discordId: discordUser.id, NOT: { id: userId } },
    })
    if (taken) {
      res.status(409).json({ message: 'Этот Discord уже привязан к другому аккаунту' })
      return
    }

    const discordRoles = await getGuildMemberRoles(discordUser.id, tokens.access_token)

    const current = await prisma.user.findUniqueOrThrow({ where: { id: userId } })

    await prisma.user.update({
      where: { id: userId },
      data: {
        discordId: discordUser.id,
        discordLinked: true,
        discordLinkToken: null,
        discordAccessToken: tokens.access_token,
        discordRefreshToken: tokens.refresh_token,
        avatar: isCustomMedia(current.avatar) ? current.avatar : discordUser.avatar,
        email: current.email || discordUser.email || current.email,
      },
    })

    await syncUserRoles(userId, discordRoles)

    const user = await loadAuthUser(userId)
    const settings = user.settings ?? (await ensureUserSettings(user.id))
    const uid = await ensureUserUid(user.id, {
      username: user.username,
      discordUsername: discordUser.username,
    })

    res.json({
      user: toPublicUser({ ...user, discriminator: String(uid) }),
      settings,
      discordLinked: true,
    })
  } catch (error) {
    discordError(res, error, 'Не удалось привязать Discord')
  }
}

export async function unlinkDiscord(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Пользователь не авторизован' })
      return
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!user) {
      res.status(404).json({ message: 'Пользователь не найден' })
      return
    }

    if (!user.password) {
      res.status(400).json({ message: 'Сначала задайте пароль, иначе вы потеряете доступ к аккаунту' })
      return
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: {
        discordId: null,
        discordLinked: false,
        discordLinkToken: null,
        discordAccessToken: null,
        discordRefreshToken: null,
      },
    })

    const updated = await loadAuthUser(req.userId)
    res.json({
      user: toPublicUser(updated),
      discordLinked: false,
    })
  } catch (error) {
    console.error('Unlink Discord error:', error)
    res.status(500).json({ message: 'Не удалось отвязать Discord' })
  }
}

export async function checkDiscordLink(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Пользователь не авторизован' })
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { discordId: true, discordLinked: true },
    })

    if (!user) {
      res.status(404).json({ message: 'Пользователь не найден' })
      return
    }

    res.json({
      discordLinked: user.discordLinked && Boolean(user.discordId),
      discordId: user.discordId,
    })
  } catch (error) {
    console.error('Check Discord link error:', error)
    res.status(500).json({ message: 'Не удалось проверить привязку Discord' })
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const email = parseString(req.body?.email).toLowerCase()
    if (!isValidEmail(email)) {
      res.status(400).json({ message: 'Укажите корректный email' })
      return
    }

    // Проверяем до поиска пользователя: иначе ответ отличался бы для
    // существующих и несуществующих адресов и выдавал бы наличие аккаунта
    if (!smtpConfigured()) {
      console.error('[auth] запрос сброса пароля при ненастроенном SMTP')
      res.status(503).json({ message: 'Отправка писем временно недоступна. Напишите в поддержку.' })
      return
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (user?.password) {
      const token = createSecureToken()
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS)

      await prisma.passwordReset.create({
        data: { userId: user.id, token, expiresAt },
      })

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExpiry: expiresAt },
      })

      await sendPasswordResetEmail(email, token)
    }

    res.json({ message: 'Если аккаунт существует, мы отправили ссылку для сброса пароля' })
  } catch (error) {
    console.error('Forgot password error:', error)
    res.status(500).json({ message: 'Не удалось отправить ссылку для сброса пароля' })
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const token = parseString(req.body?.token)
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : ''

    if (!token) {
      res.status(400).json({ message: 'Токен сброса обязателен' })
      return
    }

    if (newPassword.length < 6) {
      res.status(400).json({ message: 'Пароль должен быть не короче 6 символов' })
      return
    }

    const record = await prisma.passwordReset.findUnique({ where: { token } })
    const now = new Date()

    if (!record || record.usedAt || record.expiresAt < now) {
      res.status(400).json({ message: 'Ссылка для сброса пароля недействительна или истекла' })
      return
    }

    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: {
          password: hash,
          resetToken: null,
          resetTokenExpiry: null,
        },
      }),
      prisma.passwordReset.update({
        where: { id: record.id },
        data: { usedAt: now },
      }),
    ])

    await revokeAllSessions(record.userId)

    res.json({ message: 'Пароль обновлён. Войдите с новым паролем.' })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ message: 'Не удалось сбросить пароль' })
  }
}

export async function verifyEmail(req: Request, res: Response) {
  try {
    const token = typeof req.query.token === 'string' ? req.query.token : parseString(req.body?.token)

    if (!token) {
      res.status(400).json({ message: 'Токен подтверждения обязателен' })
      return
    }

    const record = await prisma.emailVerification.findUnique({ where: { token } })
    const now = new Date()

    if (!record || record.verifiedAt || record.expiresAt < now) {
      res.status(400).json({ message: 'Ссылка подтверждения недействительна или истекла' })
      return
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { isEmailVerified: true },
      }),
      prisma.emailVerification.update({
        where: { id: record.id },
        data: { verifiedAt: now },
      }),
    ])

    res.json({ message: 'Email подтверждён' })
  } catch (error) {
    console.error('Verify email error:', error)
    res.status(500).json({ message: 'Не удалось подтвердить email' })
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
      include: { roles: true, settings: true },
    })

    if (!user) {
      res.status(404).json({ message: 'Пользователь не найден' })
      return
    }

    const settings = user.settings ?? (await ensureUserSettings(user.id))
    const uid = await ensureUserUid(user.id, { username: user.username })

    res.json({ user: toPublicUser({ ...user, discriminator: String(uid) }), settings })
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

export async function turnstileConfig(_req: Request, res: Response) {
  const siteKey = process.env.TURNSTILE_SITE_KEY?.trim() || ''
  res.json({ enabled: Boolean(process.env.TURNSTILE_SECRET_KEY?.trim() && siteKey), siteKey })
}

export async function telegramConfig(_req: Request, res: Response) {
  try {
    const { getTelegramBotId, getTelegramBotUsername, telegramConfigured } = await import(
      '../services/telegramService'
    )
    if (!telegramConfigured()) {
      res.status(503).json({ message: 'Telegram-бот не настроен' })
      return
    }
    const botUsername = await getTelegramBotUsername()
    if (!botUsername) {
      res.status(503).json({ message: 'Не удалось получить имя бота' })
      return
    }
    // botId нужен лаунчеру для oauth.telegram.org, сам токен наружу не уходит
    res.json({ botUsername, botId: getTelegramBotId() })
  } catch (error) {
    console.error('Telegram config error:', error)
    res.status(500).json({ message: 'Не удалось загрузить Telegram' })
  }
}

export async function telegramLogin(req: Request, res: Response) {
  try {
    const { verifyTelegramAuth, telegramConfigured } = await import('../services/telegramService')
    if (!telegramConfigured()) {
      res.status(503).json({ message: 'Telegram-бот не настроен' })
      return
    }

    const payload = {
      id: Number(req.body?.id),
      first_name: parseString(req.body?.first_name) || undefined,
      last_name: parseString(req.body?.last_name) || undefined,
      username: parseString(req.body?.username) || undefined,
      photo_url: parseString(req.body?.photo_url) || undefined,
      auth_date: Number(req.body?.auth_date),
      hash: parseString(req.body?.hash),
    }

    if (!verifyTelegramAuth(payload)) {
      res.status(401).json({ message: 'Неверная подпись Telegram' })
      return
    }

    const telegramId = String(payload.id)

    // Как и с Discord: вход возможен только для уже привязанного Telegram
    const found = await prisma.user.findFirst({ where: { telegramId } })

    if (!found || !found.telegramLinked) {
      res.status(403).json({
        message:
          'Этот Telegram не привязан ни к одному аккаунту. Войдите по email и привяжите Telegram в настройках профиля.',
      })
      return
    }

    if (found.isDeleted) {
      res.status(403).json({ message: 'Аккаунт удалён' })
      return
    }

    const tgBan = await prisma.ban.findUnique({ where: { userId: found.id } })
    if (tgBan && (tgBan.isPermanent || !tgBan.expiresAt || tgBan.expiresAt > new Date())) {
      res.status(403).json({ message: tgBan.reason ? `Аккаунт заблокирован: ${tgBan.reason}` : 'Аккаунт заблокирован' })
      return
    }

    const user = await prisma.user.update({
      where: { id: found.id },
      data: { avatar: found.avatar || payload.photo_url || null },
    })

    res.json(await authPayload(user.id))
  } catch (error) {
    console.error('Telegram login error:', error)
    res.status(500).json({ message: 'Не удалось войти через Telegram' })
  }
}
