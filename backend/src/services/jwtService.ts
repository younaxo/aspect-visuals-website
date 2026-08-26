import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken'
import { prisma } from '../utils/prisma'

const ACCESS_EXPIRES_SECONDS = 15 * 60
const REFRESH_EXPIRES_SECONDS = 7 * 24 * 60 * 60
const OAUTH_STATE_EXPIRES_SECONDS = 10 * 60

export interface TokenPayload {
  userId: string
  discordId?: string
  type: 'access' | 'refresh'
  jti?: string
}

export interface OAuthStatePayload {
  type: 'oauth_state'
  purpose: 'login' | 'link'
  userId?: string
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET не задан')
  }
  return secret
}

function signToken(payload: object, expiresIn: number, extra?: SignOptions): string {
  const options: SignOptions = { expiresIn, ...extra }
  return jwt.sign(payload, getSecret(), options)
}

export function signAccessToken(payload: Omit<TokenPayload, 'type' | 'jti'>): string {
  return signToken({ ...payload, type: 'access' }, ACCESS_EXPIRES_SECONDS)
}

export function signRefreshToken(payload: Omit<TokenPayload, 'type'>, jti: string): string {
  return signToken({ ...payload, type: 'refresh' }, REFRESH_EXPIRES_SECONDS, { jwtid: jti })
}

export function verifyAccessToken(token: string): TokenPayload {
  const payload = jwt.verify(token, getSecret()) as JwtPayload & TokenPayload
  if (payload.type !== 'access' || !payload.userId) {
    throw new Error('Недействительный access-токен')
  }
  return payload
}

export function verifyRefreshToken(token: string): TokenPayload {
  const payload = jwt.verify(token, getSecret()) as JwtPayload & TokenPayload
  if (payload.type !== 'refresh' || !payload.userId || !payload.jti) {
    throw new Error('Недействительный refresh-токен')
  }
  return payload
}

export function signOAuthState(extra?: { purpose?: 'login' | 'link'; userId?: string }): string {
  return signToken(
    {
      type: 'oauth_state',
      purpose: extra?.purpose ?? 'login',
      userId: extra?.userId,
    },
    OAUTH_STATE_EXPIRES_SECONDS,
  )
}

export function verifyOAuthState(state: string): OAuthStatePayload {
  const payload = jwt.verify(state, getSecret()) as JwtPayload & OAuthStatePayload
  if (payload.type !== 'oauth_state') {
    throw new Error('Недействительный OAuth state')
  }
  return {
    type: 'oauth_state',
    purpose: payload.purpose === 'link' ? 'link' : 'login',
    userId: payload.userId,
  }
}

export async function issueTokens(user: { id: string; discordId?: string | null }) {
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      expiresAt: new Date(Date.now() + REFRESH_EXPIRES_SECONDS * 1000),
    },
  })

  const discordId = user.discordId ?? undefined

  return {
    accessToken: signAccessToken({ userId: user.id, discordId }),
    refreshToken: signRefreshToken({ userId: user.id, discordId }, session.id),
  }
}

export async function rotateRefreshToken(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken)
  const session = await prisma.session.findUnique({
    where: { id: payload.jti },
    include: { user: true },
  })

  if (!session || session.userId !== payload.userId || session.expiresAt < new Date()) {
    throw new Error('Сессия недействительна')
  }

  await prisma.session.delete({ where: { id: session.id } })

  return issueTokens({
    id: session.user.id,
    discordId: session.user.discordId,
  })
}

export async function revokeSession(refreshToken: string, userId?: string) {
  try {
    const payload = verifyRefreshToken(refreshToken)
    await prisma.session.deleteMany({
      where: {
        id: payload.jti,
        ...(userId ? { userId } : {}),
      },
    })
  } catch {
    // Токен уже недействителен — сессию всё равно считаем завершённой
  }
}

export async function revokeAllSessions(userId: string) {
  await prisma.session.deleteMany({ where: { userId } })
}
