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
 * Оформление письма в стиле лаунчера: тёмный фон, стеклянная карточка,
 * белая акцентная кнопка. Вёрстка таблицами, инлайновые стили и никакого SVG —
 * иначе почтовые клиенты ломают разметку.
 */
function layout(title: string, intro: string, buttonText: string, url: string, footer: string): string {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#09090b;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${intro}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#09090b;padding:32px 16px;">
    <tr><td align="center">

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:460px;">

        <tr><td align="center" style="padding-bottom:22px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="width:38px;height:38px;background:#fafafa;border-radius:10px;text-align:center;vertical-align:middle;
                         font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:21px;font-weight:700;color:#09090b;line-height:38px;">A</td>
              <td style="padding-left:11px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;
                         font-size:12px;font-weight:600;letter-spacing:.22em;color:#fafafa;">ASPECT VISUALS</td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="background:#18181b;border:1px solid #27272a;border-radius:14px;padding:32px;">
          <h1 style="margin:0 0 14px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;
                     font-size:20px;font-weight:600;color:#fafafa;">${title}</h1>
          <p style="margin:0 0 26px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;
                    font-size:14px;line-height:1.65;color:#a1a1aa;">${intro}</p>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="background:#fafafa;border-radius:9px;">
              <a href="${url}" style="display:inline-block;padding:12px 26px;
                 font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;
                 color:#09090b;text-decoration:none;">${buttonText}</a>
            </td></tr>
          </table>

          <div style="height:1px;background:#27272a;margin:26px 0 18px;"></div>

          <p style="margin:0 0 10px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;
                    font-size:12px;line-height:1.65;color:#71717a;">${footer}</p>
          <p style="margin:0;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;
                    font-size:11px;line-height:1.5;color:#52525b;word-break:break-all;">${url}</p>
        </td></tr>

        <tr><td align="center" style="padding-top:20px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;
                                      font-size:11px;color:#3f3f46;">
          Письмо отправлено автоматически, отвечать на него не нужно.<br />
          aspectvisuals.su
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
