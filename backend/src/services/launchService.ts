import crypto from 'crypto'
import { prisma } from '../utils/prisma'

/**
 * Запуск собственного клиента Aspect.
 *
 * Токен подписывается Ed25519: приватный ключ живёт только на backend,
 * в лаунчер и клиент попадает только публичный. Одноразовость обеспечивает
 * атомарный UPDATE ... WHERE usedAt IS NULL, поэтому отдельное хранилище
 * не нужно и гонка двух запросов невозможна.
 */

export const LAUNCH_AUDIENCE = 'game-client'
export const SESSION_AUDIENCE = 'game-session'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000
export const LAUNCH_TTL_MS = 45 * 1000
const MAX_ACTIVE_SESSIONS = 1

function env(name: string): string {
  return (process.env[name] || '').trim()
}

export function signingConfigured(): boolean {
  return Boolean(env('LAUNCH_SIGNING_PRIVATE_KEY'))
}

function privateKey(): crypto.KeyObject {
  const raw = env('LAUNCH_SIGNING_PRIVATE_KEY')
  if (!raw) throw new Error('LAUNCH_SIGNING_PRIVATE_KEY не задан')
  // Ключ хранится в base64, чтобы переносы строк PEM не ломали .env
  return crypto.createPrivateKey(Buffer.from(raw, 'base64').toString('utf8'))
}

export function publicKeyPem(): string {
  const raw = env('LAUNCH_SIGNING_PUBLIC_KEY')
  if (raw) return Buffer.from(raw, 'base64').toString('utf8')
  return crypto.createPublicKey(privateKey()).export({ type: 'spki', format: 'pem' }).toString()
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

/** Компактный подписанный контейнер: payload.signature, оба в base64url. */
export function signPayload(payload: unknown): string {
  const body = b64url(JSON.stringify(payload))
  const signature = crypto.sign(null, Buffer.from(body), privateKey())
  return `${body}.${b64url(signature)}`
}

export function verifyPayload(token: string): unknown | null {
  const [body, signature] = String(token || '').split('.')
  if (!body || !signature) return null

  try {
    const ok = crypto.verify(
      null,
      Buffer.from(body),
      crypto.createPublicKey(publicKeyPem()),
      Buffer.from(signature, 'base64url'),
    )
    if (!ok) return null
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

export interface LaunchClaims {
  jti: string
  sub: string
  username: string
  aud: string
  iat: number
  exp: number
}

export async function issueLaunchToken(userId: string, ip?: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, username: true, isDeleted: true },
  })
  if (user.isDeleted) throw new Error('Аккаунт удалён')

  const now = Date.now()
  const jti = crypto.randomUUID()
  const expiresAt = new Date(now + LAUNCH_TTL_MS)

  const record = await prisma.launchToken.create({
    data: { jti, userId: user.id, audience: LAUNCH_AUDIENCE, expiresAt, issuedIp: ip || null },
  })

  const claims: LaunchClaims = {
    jti,
    sub: user.id,
    username: user.username,
    aud: LAUNCH_AUDIENCE,
    iat: Math.floor(now / 1000),
    exp: Math.floor(expiresAt.getTime() / 1000),
  }

  return { token: signPayload(claims), expiresAt, id: record.id }
}

export interface RedeemResult {
  ok: boolean
  reason?: string
  session?: { id: string; userId: string; username: string; roles: string[]; sessionToken: string }
}

/**
 * Токен сессии выдаётся клиенту при обмене и нужен для heartbeat и выхода.
 * Без него хватило бы знания одного sessionId, чтобы завершить чужую сессию.
 */
export function signSessionToken(sessionId: string, userId: string): string {
  return signPayload({
    sid: sessionId,
    sub: userId,
    aud: SESSION_AUDIENCE,
    exp: Math.floor((Date.now() + SESSION_TTL_MS) / 1000),
  })
}

export function verifySessionToken(token: string): { sid: string; sub: string } | null {
  const claims = verifyPayload(token) as { sid?: string; sub?: string; aud?: string; exp?: number } | null
  if (!claims || claims.aud !== SESSION_AUDIENCE) return null
  if (!claims.sid || !claims.sub) return null
  if (!claims.exp || claims.exp * 1000 < Date.now()) return null
  return { sid: claims.sid, sub: claims.sub }
}

/** Обмен launch-токена на игровую сессию. Данные берутся из БД, а не из токена. */
export async function redeemLaunchToken(token: string, ip?: string): Promise<RedeemResult> {
  const claims = verifyPayload(token) as LaunchClaims | null
  if (!claims) return { ok: false, reason: 'Недействительная подпись' }
  if (claims.aud !== LAUNCH_AUDIENCE) return { ok: false, reason: 'Неверная аудитория токена' }
  if (!claims.jti || !claims.sub) return { ok: false, reason: 'Неполный токен' }
  if (claims.exp * 1000 < Date.now()) return { ok: false, reason: 'Срок действия токена истёк' }

  const record = await prisma.launchToken.findUnique({ where: { jti: claims.jti } })
  if (!record) return { ok: false, reason: 'Токен не найден' }
  if (record.userId !== claims.sub) return { ok: false, reason: 'Токен не соответствует аккаунту' }

  // Атомарно помечаем использованным: параллельный обмен не пройдёт
  const claimed = await prisma.launchToken.updateMany({
    where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  })
  if (claimed.count === 0) return { ok: false, reason: 'Токен уже использован или истёк' }

  const user = await prisma.user.findUnique({
    where: { id: record.userId },
    include: { roles: true },
  })
  if (!user || user.isDeleted) return { ok: false, reason: 'Аккаунт недоступен' }

  const ban = await prisma.ban.findUnique({ where: { userId: user.id } })
  if (ban && (ban.isPermanent || !ban.expiresAt || ban.expiresAt > new Date())) {
    return { ok: false, reason: 'Аккаунт заблокирован' }
  }

  // Ограничение параллельных подключений
  const active = await prisma.gameSession.findMany({
    where: { userId: user.id, endedAt: null },
    orderBy: { startedAt: 'asc' },
  })
  if (active.length >= MAX_ACTIVE_SESSIONS) {
    await prisma.gameSession.updateMany({
      where: { id: { in: active.slice(0, active.length - MAX_ACTIVE_SESSIONS + 1).map((s) => s.id) } },
      data: { endedAt: new Date(), endedReason: 'Начата новая сессия' },
    })
  }

  const session = await prisma.gameSession.create({
    data: {
      userId: user.id,
      launchTokenId: record.id,
      // Роли назначает сервер по данным аккаунта, присланному клиентом не доверяем
      roles: user.roles.map((role) => role.name),
      ip: ip || null,
    },
  })

  return {
    ok: true,
    session: {
      id: session.id,
      userId: user.id,
      username: user.username,
      roles: session.roles,
      sessionToken: signSessionToken(session.id, user.id),
    },
  }
}

export async function endSession(sessionId: string, userId: string, reason = 'Выход') {
  const result = await prisma.gameSession.updateMany({
    where: { id: sessionId, userId, endedAt: null },
    data: { endedAt: new Date(), endedReason: reason },
  })
  return result.count > 0
}

export async function touchSession(sessionId: string) {
  const result = await prisma.gameSession.updateMany({
    where: { id: sessionId, endedAt: null },
    data: { lastSeenAt: new Date() },
  })
  return result.count > 0
}

/** Манифест активной версии клиента вместе с подписью. */
export async function getManifest(channel: string) {
  const release = await prisma.clientRelease.findFirst({
    where: { channel, isActive: true },
    include: { files: { orderBy: { path: 'asc' } } },
  })
  if (!release) return null

  return {
    channel: release.channel,
    version: release.version,
    notes: release.notes,
    publishedAt: release.publishedAt ? release.publishedAt.toISOString() : null,
    files: release.files.map((file) => ({
      path: file.path,
      sha256: file.sha256,
      size: file.size,
      url: file.url,
      executable: file.executable,
    })),
    signature: release.signature,
  }
}

/** Подпись считается по каноническому виду списка файлов. */
export function manifestPayload(files: Array<{ path: string; sha256: string; size: number }>, version: string, channel: string) {
  const canonical = files
    .slice()
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((f) => `${f.path}:${f.sha256}:${f.size}`)
    .join('\n')
  return `${channel}\n${version}\n${canonical}`
}

export function signManifest(files: Array<{ path: string; sha256: string; size: number }>, version: string, channel: string): string {
  const payload = manifestPayload(files, version, channel)
  return crypto.sign(null, Buffer.from(payload), privateKey()).toString('base64url')
}
