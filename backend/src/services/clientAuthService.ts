import crypto from 'crypto'
import { prisma } from '../utils/prisma'
import { signSessionToken, verifySessionToken } from './launchService'

/**
 * Вход Minecraft-клиента Aspect Visuals по одноразовому коду.
 *
 * Пароль от сайта в клиент не попадает: клиент получает device-код,
 * пользователь подтверждает вход в браузере обычной сессией сайта,
 * и только после этого клиент обменивает код на токен игровой сессии.
 *
 * device-код хранится в базе только как sha256, поэтому дамп таблицы
 * не позволяет забрать чужую ожидающую авторизацию.
 */

export const DEVICE_CODE_TTL_MS = 10 * 60 * 1000
export const CLIENT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const POLL_INTERVAL_SECONDS = 5
const MAX_POLLS = Math.ceil(DEVICE_CODE_TTL_MS / 1000 / POLL_INTERVAL_SECONDS) + 20
const MAX_ACTIVE_CLIENT_SESSIONS = 3

// Без символов, которые путаются при переписывании с экрана: 0/O, 1/I, 5/S
const USER_CODE_ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY2346789'
const USER_CODE_LENGTH = 8

export type DeviceStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED'

export type DeviceError =
  | 'authorization_pending'
  | 'slow_down'
  | 'expired_token'
  | 'access_denied'
  | 'invalid_grant'

function hashDeviceCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex')
}

function randomUserCode(): string {
  const bytes = crypto.randomBytes(USER_CODE_LENGTH)
  let code = ''
  for (let i = 0; i < USER_CODE_LENGTH; i += 1) {
    code += USER_CODE_ALPHABET[bytes[i] % USER_CODE_ALPHABET.length]
  }
  return code
}

/** Пользователю код показывается как ASPT-XXXX-XXXX, в базе лежит без дефисов. */
export function formatUserCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`
}

export function normalizeUserCode(raw: unknown): string {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, USER_CODE_LENGTH)
}

function verificationBase(): string {
  const url = (process.env.FRONTEND_URL || '').split(',')[0].trim()
  return (url || 'https://aspectvisuals.su').replace(/\/+$/, '')
}

export interface DeviceRequest {
  deviceCode: string
  userCode: string
  verificationUri: string
  verificationUriComplete: string
  expiresIn: number
  interval: number
}

export async function createDeviceAuthorization(
  clientName: string,
  clientVersion: string | null,
  ip?: string,
): Promise<DeviceRequest> {
  const deviceCode = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + DEVICE_CODE_TTL_MS)

  // Коллизия короткого кода маловероятна, но живые коды не должны совпадать
  let userCode = randomUserCode()
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const taken = await prisma.deviceAuthorization.findUnique({ where: { userCode } })
    if (!taken || taken.expiresAt < new Date()) break
    userCode = randomUserCode()
  }

  await prisma.deviceAuthorization.create({
    data: {
      deviceCodeHash: hashDeviceCode(deviceCode),
      userCode,
      clientName,
      clientVersion,
      requestedIp: ip || null,
      expiresAt,
    },
  })

  const base = verificationBase()
  return {
    deviceCode,
    userCode: formatUserCode(userCode),
    verificationUri: `${base}/link`,
    verificationUriComplete: `${base}/link?code=${formatUserCode(userCode)}`,
    expiresIn: Math.floor(DEVICE_CODE_TTL_MS / 1000),
    interval: POLL_INTERVAL_SECONDS,
  }
}

export interface PendingAuthorization {
  userCode: string
  clientName: string
  clientVersion: string | null
  status: DeviceStatus
  requestedAt: string
  expiresAt: string
}

export async function findPendingByUserCode(userCode: string): Promise<PendingAuthorization | null> {
  const code = normalizeUserCode(userCode)
  if (code.length !== USER_CODE_LENGTH) return null

  const record = await prisma.deviceAuthorization.findUnique({ where: { userCode: code } })
  if (!record) return null

  const expired = record.expiresAt < new Date()
  return {
    userCode: formatUserCode(record.userCode),
    clientName: record.clientName,
    clientVersion: record.clientVersion,
    status: expired && record.status === 'PENDING' ? 'EXPIRED' : (record.status as DeviceStatus),
    requestedAt: record.createdAt.toISOString(),
    expiresAt: record.expiresAt.toISOString(),
  }
}

export type DecisionResult = { ok: true } | { ok: false; reason: string }

export async function decideDeviceAuthorization(
  userCode: string,
  userId: string,
  approve: boolean,
  ip?: string,
): Promise<DecisionResult> {
  const code = normalizeUserCode(userCode)
  if (code.length !== USER_CODE_LENGTH) {
    return { ok: false, reason: 'Код указан неверно' }
  }

  // Решение принимается атомарно: повторное подтверждение уже решённого кода не пройдёт
  const updated = await prisma.deviceAuthorization.updateMany({
    where: { userCode: code, status: 'PENDING', expiresAt: { gt: new Date() } },
    data: {
      status: approve ? 'APPROVED' : 'DENIED',
      userId,
      approvedAt: new Date(),
      approvedIp: ip || null,
    },
  })

  if (updated.count === 0) {
    return { ok: false, reason: 'Код не найден, уже использован или истёк' }
  }
  return { ok: true }
}

export interface ClientSession {
  sessionToken: string
  expiresAt: string
  session: { id: string; startedAt: string }
}

export type ExchangeResult =
  | { ok: true; value: ClientSession }
  | { ok: false; error: DeviceError; message: string }

/** Обмен подтверждённого device-кода на токен игровой сессии. */
export async function exchangeDeviceCode(deviceCode: string, ip?: string): Promise<ExchangeResult> {
  if (!deviceCode) {
    return { ok: false, error: 'invalid_grant', message: 'Код клиента не передан' }
  }

  const record = await prisma.deviceAuthorization.findUnique({
    where: { deviceCodeHash: hashDeviceCode(deviceCode) },
  })
  if (!record) {
    return { ok: false, error: 'invalid_grant', message: 'Запрос авторизации не найден' }
  }

  const now = new Date()

  // Слишком частый опрос — отдельный ответ, чтобы клиент притормозил, а не считался сломанным
  const tooSoon =
    record.lastPolledAt !== null &&
    now.getTime() - record.lastPolledAt.getTime() < POLL_INTERVAL_SECONDS * 1000 - 500
  await prisma.deviceAuthorization.update({
    where: { id: record.id },
    data: { lastPolledAt: now, pollCount: { increment: 1 } },
  })

  if (record.pollCount > MAX_POLLS) {
    return { ok: false, error: 'expired_token', message: 'Слишком много попыток' }
  }
  if (tooSoon) {
    return { ok: false, error: 'slow_down', message: 'Запросы слишком частые' }
  }
  if (record.expiresAt < now) {
    return { ok: false, error: 'expired_token', message: 'Срок действия кода истёк' }
  }
  if (record.status === 'DENIED') {
    return { ok: false, error: 'access_denied', message: 'Вход отклонён' }
  }
  if (record.status === 'PENDING') {
    return { ok: false, error: 'authorization_pending', message: 'Ожидается подтверждение на сайте' }
  }
  if (record.consumedAt || !record.userId) {
    return { ok: false, error: 'invalid_grant', message: 'Код уже использован' }
  }

  // Атомарно гасим код: две параллельные попытки обмена не создадут две сессии
  const consumed = await prisma.deviceAuthorization.updateMany({
    where: { id: record.id, status: 'APPROVED', consumedAt: null },
    data: { consumedAt: now },
  })
  if (consumed.count === 0) {
    return { ok: false, error: 'invalid_grant', message: 'Код уже использован' }
  }

  const user = await prisma.user.findUnique({ where: { id: record.userId }, include: { roles: true } })
  if (!user || user.isDeleted) {
    return { ok: false, error: 'access_denied', message: 'Аккаунт недоступен' }
  }

  const ban = await prisma.ban.findUnique({ where: { userId: user.id } })
  if (ban && (ban.isPermanent || !ban.expiresAt || ban.expiresAt > now)) {
    return { ok: false, error: 'access_denied', message: 'Аккаунт заблокирован' }
  }

  await enforceSessionLimit(user.id)

  const expiresAt = new Date(now.getTime() + CLIENT_SESSION_TTL_MS)
  const session = await prisma.gameSession.create({
    data: {
      userId: user.id,
      deviceAuthId: record.id,
      kind: 'minecraft',
      label: record.clientVersion ? `${record.clientName} ${record.clientVersion}` : record.clientName,
      // Роли берём из аккаунта: клиент не может объявить себя администратором
      roles: user.roles.map((role) => role.name),
      ip: ip || null,
      expiresAt,
    },
  })

  return {
    ok: true,
    value: {
      sessionToken: signSessionToken(session.id, user.id, CLIENT_SESSION_TTL_MS),
      expiresAt: expiresAt.toISOString(),
      session: { id: session.id, startedAt: session.startedAt.toISOString() },
    },
  }
}

async function enforceSessionLimit(userId: string) {
  const active = await prisma.gameSession.findMany({
    where: { userId, endedAt: null, kind: 'minecraft' },
    orderBy: { startedAt: 'asc' },
    select: { id: true },
  })
  const excess = active.length - (MAX_ACTIVE_CLIENT_SESSIONS - 1)
  if (excess > 0) {
    await prisma.gameSession.updateMany({
      where: { id: { in: active.slice(0, excess).map((item) => item.id) } },
      data: { endedAt: new Date(), endedReason: 'Превышен лимит подключённых клиентов' },
    })
  }
}

export interface ResolvedSession {
  sessionId: string
  userId: string
}

/**
 * Токен подписан, но авторитет — база: сессию можно отозвать с сайта,
 * и следующий же запрос клиента об этом узнает.
 */
export async function resolveClientSession(token: string): Promise<ResolvedSession | null> {
  const claims = verifySessionToken(token)
  if (!claims) return null

  const session = await prisma.gameSession.findUnique({ where: { id: claims.sid } })
  if (!session || session.userId !== claims.sub) return null
  if (session.endedAt) return null
  if (session.expiresAt && session.expiresAt < new Date()) return null

  return { sessionId: session.id, userId: session.userId }
}

/** Продление сессии без повторного подтверждения на сайте. */
export async function refreshClientSession(sessionId: string, userId: string): Promise<ClientSession | null> {
  const expiresAt = new Date(Date.now() + CLIENT_SESSION_TTL_MS)
  const updated = await prisma.gameSession.updateMany({
    where: { id: sessionId, userId, endedAt: null },
    data: { expiresAt, lastSeenAt: new Date() },
  })
  if (updated.count === 0) return null

  const session = await prisma.gameSession.findUniqueOrThrow({ where: { id: sessionId } })
  return {
    sessionToken: signSessionToken(sessionId, userId, CLIENT_SESSION_TTL_MS),
    expiresAt: expiresAt.toISOString(),
    session: { id: session.id, startedAt: session.startedAt.toISOString() },
  }
}

export interface ClientSessionSummary {
  id: string
  label: string
  startedAt: string
  lastSeenAt: string
  expiresAt: string | null
  current: boolean
}

export async function listClientSessions(userId: string, currentSessionId?: string): Promise<ClientSessionSummary[]> {
  const sessions = await prisma.gameSession.findMany({
    where: { userId, endedAt: null, kind: 'minecraft' },
    orderBy: { lastSeenAt: 'desc' },
  })

  return sessions.map((session) => ({
    id: session.id,
    label: session.label || 'Aspect Visuals',
    startedAt: session.startedAt.toISOString(),
    lastSeenAt: session.lastSeenAt.toISOString(),
    expiresAt: session.expiresAt ? session.expiresAt.toISOString() : null,
    current: session.id === currentSessionId,
  }))
}

export async function revokeClientSession(sessionId: string, userId: string, reason: string): Promise<boolean> {
  const result = await prisma.gameSession.updateMany({
    where: { id: sessionId, userId, endedAt: null },
    data: { endedAt: new Date(), endedReason: reason },
  })
  return result.count > 0
}
