import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import test from 'node:test'

import {
  isPaidCallback,
  parseRollyPayCallback,
  rollypayConfig,
  rollypayMode,
  verifyRollyPaySignature,
} from './rollypay'

const SECRET = 'test-signing-secret'

function sign(body: string, timestamp: string, secret = SECRET): string {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
}

function now(): string {
  return String(Math.floor(Date.now() / 1000))
}

test('подпись колбэка принимается при совпадении', () => {
  const body = JSON.stringify({ event_type: 'payment.paid', order_id: 'order_1' })
  const ts = now()
  assert.equal(verifyRollyPaySignature(body, sign(body, ts), ts, SECRET), true)
})

test('подпись в верхнем регистре тоже принимается', () => {
  const body = '{"a":1}'
  const ts = now()
  assert.equal(verifyRollyPaySignature(body, sign(body, ts).toUpperCase(), ts, SECRET), true)
})

test('изменённое тело подпись не проходит', () => {
  const body = JSON.stringify({ order_id: 'order_1', amount: '100.00' })
  const ts = now()
  const signature = sign(body, ts)
  const tampered = JSON.stringify({ order_id: 'order_1', amount: '1.00' })
  assert.equal(verifyRollyPaySignature(tampered, signature, ts, SECRET), false)
})

test('чужой ключ подпись не проходит', () => {
  const body = '{"x":1}'
  const ts = now()
  assert.equal(verifyRollyPaySignature(body, sign(body, ts, 'другой-ключ'), ts, SECRET), false)
})

test('подпись без timestamp или без заголовка отклоняется', () => {
  const body = '{"x":1}'
  const ts = now()
  assert.equal(verifyRollyPaySignature(body, sign(body, ts), undefined, SECRET), false)
  assert.equal(verifyRollyPaySignature(body, undefined, ts, SECRET), false)
})

test('просроченный колбэк отклоняется, свежий — нет', () => {
  const body = '{"x":1}'
  const old = String(Math.floor(Date.now() / 1000) - 3600)
  assert.equal(verifyRollyPaySignature(body, sign(body, old), old, SECRET), false)

  const fresh = String(Math.floor(Date.now() / 1000) - 60)
  assert.equal(verifyRollyPaySignature(body, sign(body, fresh), fresh, SECRET), true)
})

test('timestamp в миллисекундах понимается', () => {
  const body = '{"x":1}'
  const ts = String(Date.now())
  assert.equal(verifyRollyPaySignature(body, sign(body, ts), ts, SECRET), true)
})

test('мусор вместо подписи не роняет проверку', () => {
  const body = '{"x":1}'
  const ts = now()
  for (const bad of ['', 'не-хекс', 'ab', 'f'.repeat(63), 'f'.repeat(65)]) {
    assert.equal(verifyRollyPaySignature(body, bad, ts, SECRET), false)
  }
})

test('колбэк оплаты разбирается и признаётся оплаченным', () => {
  const callback = parseRollyPayCallback({
    event_type: 'payment.paid',
    payment_id: 'pay_a1b2',
    order_id: 'order_12345',
    status: 'paid',
    amount: '1500.00',
    currency: 'RUB',
  })
  assert.equal(callback.orderId, 'order_12345')
  assert.equal(callback.paymentId, 'pay_a1b2')
  assert.equal(callback.amount, '1500.00')
  assert.equal(isPaidCallback(callback), true)
})

test('неоплаченный колбэк заказ не закрывает', () => {
  const created = parseRollyPayCallback({ event_type: 'payment.created', status: 'created' })
  assert.equal(isPaidCallback(created), false)

  const failed = parseRollyPayCallback({ event_type: 'payment.expired', status: 'expired' })
  assert.equal(isPaidCallback(failed), false)
})

test('режим по умолчанию тестовый, live включается явно', () => {
  const saved = process.env.ROLLYPAY_MODE
  try {
    delete process.env.ROLLYPAY_MODE
    assert.equal(rollypayMode(), 'test')
    process.env.ROLLYPAY_MODE = 'production'
    assert.equal(rollypayMode(), 'test')
    process.env.ROLLYPAY_MODE = 'live'
    assert.equal(rollypayMode(), 'live')
  } finally {
    if (saved === undefined) delete process.env.ROLLYPAY_MODE
    else process.env.ROLLYPAY_MODE = saved
  }
})

test('конфиг берёт ключи своего режима и не смешивает их', () => {
  const saved = { ...process.env }
  try {
    process.env.ROLLYPAY_MODE = 'test'
    process.env.ROLLYPAY_TEST_API_KEY = 'test-key'
    process.env.ROLLYPAY_TEST_SIGNING_SECRET = 'test-secret'
    process.env.ROLLYPAY_LIVE_API_KEY = 'live-key'
    process.env.ROLLYPAY_LIVE_SIGNING_SECRET = 'live-secret'

    const test = rollypayConfig()
    assert.equal(test?.apiKey, 'test-key')
    assert.equal(test?.mode, 'test')

    process.env.ROLLYPAY_MODE = 'live'
    assert.equal(rollypayConfig()?.apiKey, 'live-key')

    delete process.env.ROLLYPAY_LIVE_SIGNING_SECRET
    // Без пары ключей это «не подключён», а не «подключён наполовину».
    assert.equal(rollypayConfig(), null)
  } finally {
    process.env = saved
  }
})
