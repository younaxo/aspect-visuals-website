import crypto from 'crypto'
import axios from 'axios'

export type PaymentProvider = 'unitpay' | 'stripe' | 'mock'

export interface CreatePaymentInput {
  orderId: string
  amount: number
  description: string
  email?: string | null
  provider?: PaymentProvider
}

export interface CreatedPayment {
  provider: PaymentProvider
  paymentId: string
  confirmationUrl: string
}

function frontendUrl(): string {
  return process.env.FRONTEND_URL || 'http://localhost:5173'
}

function allowMock(): boolean {
  return process.env.PAYMENT_MOCK === 'true' || process.env.NODE_ENV !== 'production'
}

function unitpaySignature(params: Record<string, string>, secret: string): string {
  const values = Object.keys(params)
    .sort()
    .filter((key) => key !== 'signature')
    .map((key) => params[key])
  values.push(secret)
  return crypto.createHash('sha256').update(values.join('{up}')).digest('hex')
}

async function createUnitPayPayment(input: CreatePaymentInput): Promise<CreatedPayment> {
  const publicKey = process.env.UNITPAY_PUBLIC_KEY
  const secret = process.env.UNITPAY_SECRET_KEY
  if (!publicKey || !secret) {
    throw new Error('UnitPay не настроен')
  }

  const params: Record<string, string> = {
    account: input.orderId,
    sum: input.amount.toFixed(2),
    desc: input.description,
    currency: 'RUB',
  }
  const signature = unitpaySignature(params, secret)
  const query = new URLSearchParams({ ...params, signature })
  return {
    provider: 'unitpay',
    paymentId: `unitpay_${input.orderId}`,
    confirmationUrl: `https://unitpay.ru/pay/${publicKey}?${query.toString()}`,
  }
}

async function createStripePayment(input: CreatePaymentInput): Promise<CreatedPayment> {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) {
    throw new Error('Stripe не настроен')
  }

  const body = new URLSearchParams({
    'mode': 'payment',
    'success_url': `${frontendUrl()}/shop/checkout?paid=1&order=${input.orderId}`,
    'cancel_url': `${frontendUrl()}/shop/checkout?canceled=1`,
    'client_reference_id': input.orderId,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'rub',
    'line_items[0][price_data][unit_amount]': String(Math.round(input.amount * 100)),
    'line_items[0][price_data][product_data][name]': input.description,
  })

  const { data } = await axios.post<{ id: string; url: string }>(
    'https://api.stripe.com/v1/checkout/sessions',
    body,
    {
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  )

  return {
    provider: 'stripe',
    paymentId: data.id,
    confirmationUrl: data.url,
  }
}

function createMockPayment(input: CreatePaymentInput): CreatedPayment {
  return {
    provider: 'mock',
    paymentId: `mock_${input.orderId}`,
    confirmationUrl: `${frontendUrl()}/shop/pay/${input.orderId}`,
  }
}

export async function createPayment(input: CreatePaymentInput): Promise<CreatedPayment> {
  const requested = input.provider || (process.env.PAYMENT_PROVIDER as PaymentProvider | undefined) || 'unitpay'

  try {
    if (requested === 'stripe') {
      return await createStripePayment(input)
    }
    if (requested === 'unitpay') {
      return await createUnitPayPayment(input)
    }
  } catch (error) {
    if (!allowMock()) throw error
  }

  if (!allowMock()) {
    throw new Error('Платёжная система не настроена')
  }

  return createMockPayment(input)
}

export async function confirmPayment(paymentId: string): Promise<{ ok: boolean; paymentId: string }> {
  return { ok: Boolean(paymentId), paymentId }
}

export async function refundPayment(paymentId: string): Promise<{ ok: boolean; paymentId: string }> {
  return { ok: Boolean(paymentId), paymentId }
}

export function handleWebhook(payload: Record<string, unknown>, provider: PaymentProvider): {
  orderId: string | null
  paymentId: string | null
  success: boolean
} {
  if (provider === 'unitpay') {
    const method = String(payload.method || payload['params[method]'] || '')
    const account = String(
      payload.account ||
        (payload.params as { account?: string } | undefined)?.account ||
        payload['params[account]'] ||
        '',
    )
    return {
      orderId: account || null,
      paymentId: account ? `unitpay_${account}` : null,
      success: method === 'pay' || method === '',
    }
  }

  if (provider === 'stripe') {
    const type = String(payload.type || '')
    const object = (payload.data as { object?: Record<string, unknown> } | undefined)?.object
    return {
      orderId: object ? String(object.client_reference_id || '') || null : null,
      paymentId: object ? String(object.id || '') || null : null,
      success: type === 'checkout.session.completed',
    }
  }

  const orderId = String(payload.orderId || payload.account || '')
  return {
    orderId: orderId || null,
    paymentId: String(payload.paymentId || `mock_${orderId}`),
    success: payload.success !== false,
  }
}
