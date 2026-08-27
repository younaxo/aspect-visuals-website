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

/**
 * Оформление письма фирменными средствами проекта:
 * знак Aspect из frontend/public/brand, шрифт Onest и токены цвета
 * из frontend/src/index.css (--bg, --accent, карточка #18181b, рамка #27272a).
 *
 * Вёрстка таблицами с инлайновыми стилями: почтовые клиенты вырезают
 * внешний CSS и SVG, поэтому знак подключается растровым PNG,
 * а Onest — ссылкой на Google Fonts со штатным фолбэком сайта.
 */
const BRAND = {
  bg: '#0b0b0f',
  card: '#18181b',
  border: '#27272a',
  accent: '#fafafa',
  text: '#a1a1aa',
  muted: '#71717a',
  faint: '#52525b',
  font: "'Onest','Segoe UI',system-ui,Roboto,Helvetica,Arial,sans-serif",
}

function logoUrl(): string {
  return `${FRONTEND_URL()}/brand/logo-mark-128.png`
}

function layout(title: string, intro: string, buttonText: string, url: string, footer: string): string {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${intro}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};padding:36px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:460px;">

        <tr><td align="center" style="padding-bottom:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="vertical-align:middle;">
                <img src="${logoUrl()}" width="34" height="34" alt="Aspect Visuals"
                     style="display:block;width:34px;height:34px;border:0;" />
              </td>
              <td style="padding-left:12px;vertical-align:middle;font-family:${BRAND.font};
                         font-size:12px;font-weight:600;letter-spacing:.24em;color:${BRAND.accent};">ASPECT VISUALS</td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:14px;padding:32px;">
          <h1 style="margin:0 0 14px;font-family:${BRAND.font};font-size:20px;font-weight:600;color:${BRAND.accent};">${title}</h1>
          <p style="margin:0 0 26px;font-family:${BRAND.font};font-size:14px;line-height:1.65;color:${BRAND.text};">${intro}</p>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="background:${BRAND.accent};border-radius:9px;">
              <a href="${url}" style="display:inline-block;padding:12px 26px;font-family:${BRAND.font};
                 font-size:14px;font-weight:600;color:${BRAND.bg};text-decoration:none;">${buttonText}</a>
            </td></tr>
          </table>

          <div style="height:1px;background:${BRAND.border};margin:26px 0 18px;"></div>

          <p style="margin:0 0 10px;font-family:${BRAND.font};font-size:12px;line-height:1.65;color:${BRAND.muted};">${footer}</p>
          <p style="margin:0;font-family:${BRAND.font};font-size:11px;line-height:1.5;word-break:break-all;">
            <a href="${url}" style="color:${BRAND.faint};text-decoration:none;">${url}</a>
          </p>
        </td></tr>

        <tr><td align="center" style="padding-top:20px;font-family:${BRAND.font};font-size:11px;line-height:1.6;color:#3f3f46;">
          Письмо отправлено автоматически, отвечать на него не нужно.<br />
          <a href="${FRONTEND_URL()}" style="color:${BRAND.muted};text-decoration:none;">aspectvisuals.su</a>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
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
