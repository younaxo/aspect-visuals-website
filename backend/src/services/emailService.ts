import crypto from 'crypto'

const FRONTEND_URL = () => process.env.FRONTEND_URL || 'http://localhost:5173'

export function createSecureToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function logMail(subject: string, to: string, body: string) {
  console.log(`[email] ${subject} → ${to}\n${body}`)
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const url = `${FRONTEND_URL()}/verify-email?token=${encodeURIComponent(token)}`
  logMail('Подтверждение email', to, `Подтвердите почту: ${url}`)
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const url = `${FRONTEND_URL()}/reset-password?token=${encodeURIComponent(token)}`
  logMail('Сброс пароля', to, `Сбросить пароль: ${url}`)
}
