import crypto from 'crypto'
import axios from 'axios'

/**
 * Клиент платёжного API RollyPay (https://docs.rollypay.io).
 *
 * Отдельная касса (терминал) держит свой API-ключ и свой signing_secret —
 * первый подписывает наши запросы, второй проверяет их колбэки. Тестовый
 * и боевой режим отличаются только парой ключей и базовым URL, поэтому
 * сведены к одному ROLLYPAY_MODE: иначе легко выкатить в прод ключ песочницы
 * и узнать об этом от покупателя.
 */

export type RollyPayMode = 'test' | 'live'

export interface RollyPayConfig {
  mode: RollyPayMode
  baseUrl: string
  apiKey: string
  signingSecret: string
  terminalId?: string
}

export interface RollyPayPayment {
  paymentId: string
  payUrl: string
  status: string
}

export interface RollyPayCallback {
  eventType: string
  paymentId: string | null
  orderId: string | null
  status: string
  amount: string | null
  currency: string | null
}

const LIVE_BASE_URL = 'https://rollypay.io/api/v1'

export function rollypayMode(): RollyPayMode {
  return process.env.ROLLYPAY_MODE === 'live' ? 'live' : 'test'
}

/**
 * Конфиг собирается только из окружения: ключи кассы не хранятся в базе и не
 * попадают в репозиторий. Возвращаем null, а не бросаем, чтобы вызывающий код
 * мог отличить «RollyPay не подключён» от «RollyPay ответил ошибкой».
 */
export function rollypayConfig(): RollyPayConfig | null {
  const mode = rollypayMode()
  const prefix = mode === 'live' ? 'ROLLYPAY_LIVE' : 'ROLLYPAY_TEST'
  const apiKey = process.env[`${prefix}_API_KEY`]
  const signingSecret = process.env[`${prefix}_SIGNING_SECRET`]
  if (!apiKey || !signingSecret) return null

  return {
    mode,
    baseUrl: (process.env.ROLLYPAY_BASE_URL || LIVE_BASE_URL).replace(/\/+$/, ''),
    apiKey,
    signingSecret,
    terminalId: process.env[`${prefix}_TERMINAL_ID`] || undefined,
  }
}

export interface CreateRollyPayInput {
  orderId: string
  amount: number
  description: string
  customerId?: string | null
  successRedirectUrl: string
  failRedirectUrl: string
}

/**
 * Создаёт платёж и возвращает ссылку на страницу оплаты.
 *
 * Сумма уходит строкой с двумя знаками: API принимает строку, а перевод
 * рубля через double по дороге уже давал 999.9999999999999.
 */
export async function createRollyPayPayment(
  input: CreateRollyPayInput,
  config: RollyPayConfig,
): Promise<RollyPayPayment> {
  const body: Record<string, unknown> = {
    amount: input.amount.toFixed(2),
    order_id: input.orderId,
    payment_currency: 'RUB',
    description: input.description,
    success_redirect_url: input.successRedirectUrl,
    fail_redirect_url: input.failRedirectUrl,
    metadata: { mode: config.mode },
  }
  if (input.customerId) body.customer_id = input.customerId
  if (config.terminalId) body.terminal_id = config.terminalId

  const { data } = await axios.post<Record<string, unknown>>(`${config.baseUrl}/payments`, body, {
    timeout: 15000,
    headers: {
      'X-API-Key': config.apiKey,
      // Нонс обязателен: RollyPay отбрасывает повтор запроса с тем же значением.
      'X-Nonce': crypto.randomUUID(),
      'Content-Type': 'application/json',
    },
  })

  const payUrl = asString(data.pay_url) || asString(data.payment_url)
  const paymentId = asString(data.payment_id) || asString(data.id)
  if (!payUrl || !paymentId) {
    throw new Error('RollyPay не вернул ссылку на оплату')
  }

  return { paymentId, payUrl, status: asString(data.status) || 'created' }
}

export async function fetchRollyPayPayment(
  paymentId: string,
  config: RollyPayConfig,
): Promise<{ status: string; orderId: string | null }> {
  const { data } = await axios.get<Record<string, unknown>>(
    `${config.baseUrl}/payments/${encodeURIComponent(paymentId)}`,
    {
      timeout: 15000,
      headers: { 'X-API-Key': config.apiKey, 'X-Nonce': crypto.randomUUID() },
    },
  )
  return { status: asString(data.status) || '', orderId: asString(data.order_id) || null }
}

/**
 * Проверяет подпись колбэка: HMAC-SHA256 от «timestamp.тело» на signing_secret
 * кассы. Сравнение — timingSafeEqual, обычное === по строке подписи утекает
 * позицию первого несовпавшего байта.
 *
 * Тело нужно сырое, ровно как пришло: JSON.stringify(req.body) переставляет
 * пробелы и порядок ключей, и подпись перестаёт сходиться.
 */
export function verifyRollyPaySignature(
  rawBody: string,
  signature: string | undefined,
  timestamp: string | undefined,
  signingSecret: string,
  maxAgeSeconds = 300,
): boolean {
  if (!signature || !timestamp) return false

  const sent = signature.trim().toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(sent)) return false

  const ts = Number(timestamp)
  if (!Number.isFinite(ts)) return false
  // Секунды или миллисекунды — RollyPay шлёт unix-время, нормализуем оба вида.
  const tsSeconds = ts > 1e12 ? Math.floor(ts / 1000) : ts
  const age = Math.abs(Math.floor(Date.now() / 1000) - tsSeconds)
  if (age > maxAgeSeconds) return false

  const expected = crypto
    .createHmac('sha256', signingSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex')

  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sent, 'hex'))
}

export function parseRollyPayCallback(payload: Record<string, unknown>): RollyPayCallback {
  return {
    eventType: asString(payload.event_type),
    paymentId: asString(payload.payment_id) || null,
    orderId: asString(payload.order_id) || null,
    status: asString(payload.status).toLowerCase(),
    amount: asString(payload.amount) || null,
    currency: asString(payload.currency) || null,
  }
}

export function isPaidCallback(callback: RollyPayCallback): boolean {
  return callback.eventType === 'payment.paid' || callback.status === 'paid'
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : ''
}
