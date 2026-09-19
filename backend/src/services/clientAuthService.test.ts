import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import test from 'node:test'

// Тест гоняет логику авторизации клиента без базы: prisma подменяется
// в кэше модулей до первой загрузки сервиса.
type Row = Record<string, any>

const store: { devices: Row[]; sessions: Row[]; users: Row[]; bans: Row[] } = {
  devices: [],
  sessions: [],
  users: [],
  bans: [],
}

let idCounter = 0
function nextId(prefix: string): string {
  idCounter += 1
  return `${prefix}${idCounter}`
}

function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, expected]) => {
    if (expected === null) return row[key] === null || row[key] === undefined
    if (typeof expected === 'object' && expected !== null && !(expected instanceof Date)) {
      if ('gt' in expected) return row[key] instanceof Date && row[key] > expected.gt
      if ('in' in expected) return (expected.in as unknown[]).includes(row[key])
    }
    return row[key] === expected
  })
}

function collection(rows: Row[], prefix: string, defaults: Row = {}) {
  return {
    create: async ({ data }: { data: Row }) => {
      const row = { id: nextId(prefix), createdAt: new Date(), ...defaults, ...data }
      rows.push(row)
      return row
    },
    findUnique: async ({ where }: { where: Row }) => rows.find((row) => matches(row, where)) ?? null,
    findUniqueOrThrow: async ({ where }: { where: Row }) => {
      const row = rows.find((item) => matches(item, where))
      if (!row) throw new Error('not found')
      return row
    },
    findFirst: async ({ where }: { where: Row }) => rows.find((row) => matches(row, where)) ?? null,
    findMany: async ({ where }: { where?: Row } = {}) =>
      rows.filter((row) => (where ? matches(row, where) : true)),
    update: async ({ where, data }: { where: Row; data: Row }) => {
      const row = rows.find((item) => matches(item, where))
      if (!row) throw new Error('not found')
      Object.assign(row, applyData(row, data))
      return row
    },
    updateMany: async ({ where, data }: { where: Row; data: Row }) => {
      const affected = rows.filter((row) => matches(row, where))
      affected.forEach((row) => Object.assign(row, applyData(row, data)))
      return { count: affected.length }
    },
  }
}

function applyData(row: Row, data: Row): Row {
  const result: Row = {}
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && 'increment' in value) {
      result[key] = (row[key] ?? 0) + (value as { increment: number }).increment
    } else {
      result[key] = value
    }
  }
  return result
}

// Значения по умолчанию повторяют схему Prisma: без них проверки на null
// в сервисе получали бы undefined и вели себя не как на настоящей базе
const fakePrisma = {
  deviceAuthorization: collection(store.devices, 'device', {
    status: 'PENDING',
    userId: null,
    requestedIp: null,
    approvedIp: null,
    lastPolledAt: null,
    pollCount: 0,
    approvedAt: null,
    consumedAt: null,
  }),
  gameSession: collection(store.sessions, 'session', {
    startedAt: new Date(),
    lastSeenAt: new Date(),
    launchTokenId: null,
    deviceAuthId: null,
    label: null,
    expiresAt: null,
    endedAt: null,
    endedReason: null,
  }),
  user: collection(store.users, 'user'),
  ban: collection(store.bans, 'ban'),
}

const { privateKey } = crypto.generateKeyPairSync('ed25519')
process.env.LAUNCH_SIGNING_PRIVATE_KEY = Buffer.from(
  privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
).toString('base64')
process.env.FRONTEND_URL = 'https://example.test'

const prismaPath = require.resolve('../utils/prisma')
require.cache[prismaPath] = {
  id: prismaPath,
  filename: prismaPath,
  loaded: true,
  exports: { prisma: fakePrisma },
} as unknown as NodeJS.Module

const service = require('./clientAuthService') as typeof import('./clientAuthService')

function reset() {
  store.devices.length = 0
  store.sessions.length = 0
  store.users.length = 0
  store.bans.length = 0
  store.users.push({ id: 'u1', username: 'younaxo', isDeleted: false, roles: [{ name: 'Developer' }] })
}

function stripInterval(userCode: string) {
  const device = store.devices.find((row) => row.userCode === userCode.replace('-', ''))
  if (device) device.lastPolledAt = null
  return device
}

test('код выдаётся в человекочитаемом виде и ведёт на страницу подтверждения', async () => {
  reset()
  const request = await service.createDeviceAuthorization('Aspect Visuals', '0.1.0', '127.0.0.1')

  assert.match(request.userCode, /^[A-Z0-9]{4}-[A-Z0-9]{4}$/)
  assert.equal(request.verificationUri, 'https://example.test/link')
  assert.ok(request.verificationUriComplete.includes(request.userCode))
  assert.ok(request.deviceCode.length >= 32)

  // В базе лежит только хэш кода
  assert.equal(store.devices.length, 1)
  assert.equal(store.devices[0].deviceCodeHash.length, 64)
  assert.ok(!JSON.stringify(store.devices[0]).includes(request.deviceCode))
})

test('до подтверждения обмен отвечает ожиданием', async () => {
  reset()
  const request = await service.createDeviceAuthorization('Aspect Visuals', null)

  const result = await service.exchangeDeviceCode(request.deviceCode)
  assert.equal(result.ok, false)
  assert.equal(result.ok === false && result.error, 'authorization_pending')
})

test('слишком частый опрос получает slow_down', async () => {
  reset()
  const request = await service.createDeviceAuthorization('Aspect Visuals', null)

  await service.exchangeDeviceCode(request.deviceCode)
  const second = await service.exchangeDeviceCode(request.deviceCode)

  assert.equal(second.ok, false)
  assert.equal(second.ok === false && second.error, 'slow_down')
})

test('после подтверждения выдаётся сессия, а код гасится', async () => {
  reset()
  const request = await service.createDeviceAuthorization('Aspect Visuals', '0.1.0')

  const decision = await service.decideDeviceAuthorization(request.userCode, 'u1', true)
  assert.equal(decision.ok, true)

  stripInterval(request.userCode)
  const granted = await service.exchangeDeviceCode(request.deviceCode, '127.0.0.1')
  assert.equal(granted.ok, true)
  if (!granted.ok) return

  assert.ok(granted.value.sessionToken.includes('.'))
  assert.equal(store.sessions.length, 1)
  assert.equal(store.sessions[0].kind, 'minecraft')
  // Роли берутся из аккаунта, а не из того, что прислал клиент
  assert.deepEqual(store.sessions[0].roles, ['Developer'])

  stripInterval(request.userCode)
  const replay = await service.exchangeDeviceCode(request.deviceCode)
  assert.equal(replay.ok, false)
  assert.equal(replay.ok === false && replay.error, 'invalid_grant')
})

test('отклонённый вход не выдаёт сессию', async () => {
  reset()
  const request = await service.createDeviceAuthorization('Aspect Visuals', null)

  await service.decideDeviceAuthorization(request.userCode, 'u1', false)
  stripInterval(request.userCode)

  const result = await service.exchangeDeviceCode(request.deviceCode)
  assert.equal(result.ok, false)
  assert.equal(result.ok === false && result.error, 'access_denied')
  assert.equal(store.sessions.length, 0)
})

test('истёкший код не подтверждается и не обменивается', async () => {
  reset()
  const request = await service.createDeviceAuthorization('Aspect Visuals', null)
  store.devices[0].expiresAt = new Date(Date.now() - 1000)

  const decision = await service.decideDeviceAuthorization(request.userCode, 'u1', true)
  assert.equal(decision.ok, false)

  stripInterval(request.userCode)
  const result = await service.exchangeDeviceCode(request.deviceCode)
  assert.equal(result.ok, false)
  assert.equal(result.ok === false && result.error, 'expired_token')
})

test('токен сессии перестаёт действовать после отзыва с сайта', async () => {
  reset()
  const request = await service.createDeviceAuthorization('Aspect Visuals', null)
  await service.decideDeviceAuthorization(request.userCode, 'u1', true)
  stripInterval(request.userCode)

  const granted = await service.exchangeDeviceCode(request.deviceCode)
  assert.equal(granted.ok, true)
  if (!granted.ok) return

  const token = granted.value.sessionToken
  assert.ok(await service.resolveClientSession(token))

  await service.revokeClientSession(granted.value.session.id, 'u1', 'Отозвано с сайта')
  assert.equal(await service.resolveClientSession(token), null)
})

test('чужой или испорченный токен не проходит', async () => {
  reset()
  assert.equal(await service.resolveClientSession('мусор'), null)
  assert.equal(await service.resolveClientSession(''), null)
})

test('нормализация кода терпима к регистру и разделителям', () => {
  assert.equal(service.normalizeUserCode(' ab-cd ef2 '), 'ABCDEF2')
  assert.equal(service.formatUserCode('ABCDEF23'), 'ABCD-EF23')
})
