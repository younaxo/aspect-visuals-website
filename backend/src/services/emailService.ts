import crypto from 'crypto'
import nodemailer, { type Transporter } from 'nodemailer'

const FRONTEND_URL = () => (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')

export function createSecureToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function env(name: string): string {
  return (process.env[name] || '').trim()
}

export function smtpConfigured(): boolean {
  return Boolean(env('SMTP_HOST') && env('SMTP_USER') && env('SMTP_PASS'))
}

let transporter: Transporter | null = null

function getTransporter(): Transporter | null {
  if (!smtpConfigured()) return null
  if (transporter) return transporter

  const port = Number(env('SMTP_PORT')) || 587
  transporter = nodemailer.createTransport({
    host: env('SMTP_HOST'),
    port,
    // 465 — неявный TLS, остальные порты используют STARTTLS
    secure: port === 465,
    auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') },
  })

  return transporter
}

/** Адрес отправителя писем авторизации. */
function mailFrom(): string {
  return env('MAIL_FROM') || 'Aspect Visuals <auth@aspectvisuals.su>'
}

interface MailInput {
  to: string
  subject: string
  text: string
  html: string
}

async function sendMail({ to, subject, text, html }: MailInput): Promise<void> {
  const mailer = getTransporter()

  if (!mailer) {
    // Без SMTP письмо отправить нельзя. Пишем в лог и сообщаем вызывающему коду,
    // чтобы пользователю не показывали ложное «письмо отправлено».
    console.warn(`[email] SMTP не настроен, письмо "${subject}" для ${to} не отправлено`)
    throw new Error('SMTP не настроен')
  }

  await mailer.sendMail({ from: mailFrom(), to, subject, text, html })
  console.log(`[email] отправлено "${subject}" → ${to}`)
}

function layout(title: string, intro: string, buttonText: string, url: string, footer: string): string {
  return `<!doctype html>
<html lang="ru"><body style="margin:0;padding:24px;background:#09090b;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:#18181b;border:1px solid #27272a;border-radius:12px;padding:32px;">
        <tr><td>
          <p style="margin:0 0 4px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#71717a;">Aspect Visuals</p>
          <h1 style="margin:0 0 16px;font-size:20px;color:#fafafa;">${title}</h1>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#a1a1aa;">${intro}</p>
          <a href="${url}" style="display:inline-block;padding:11px 22px;border-radius:8px;background:#fafafa;color:#09090b;font-size:14px;font-weight:600;text-decoration:none;">${buttonText}</a>
          <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#71717a;">${footer}</p>
          <p style="margin:12px 0 0;font-size:12px;color:#52525b;word-break:break-all;">${url}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const url = `${FRONTEND_URL()}/verify-email?token=${encodeURIComponent(token)}`
  await sendMail({
    to,
    subject: 'Подтверждение почты — Aspect Visuals',
    text: `Подтвердите почту: ${url}`,
    html: layout(
      'Подтвердите почту',
      'Чтобы завершить регистрацию в Aspect Visuals, подтвердите адрес электронной почты.',
      'Подтвердить почту',
      url,
      'Ссылка действует 24 часа. Если вы не регистрировались, просто проигнорируйте письмо.',
    ),
  })
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const url = `${FRONTEND_URL()}/reset-password?token=${encodeURIComponent(token)}`
  await sendMail({
    to,
    subject: 'Сброс пароля — Aspect Visuals',
    text: `Сбросить пароль: ${url}`,
    html: layout(
      'Сброс пароля',
      'Мы получили запрос на смену пароля от вашего аккаунта Aspect Visuals.',
      'Задать новый пароль',
      url,
      'Ссылка действует 1 час и срабатывает один раз. Если вы не запрашивали смену пароля, ничего делать не нужно — пароль останется прежним.',
    ),
  })
}
