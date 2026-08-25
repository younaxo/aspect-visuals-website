import { Logo } from '../Common/Logo'

const socials = [
  { label: 'Telegram', href: 'https://t.me/aspectvisuals' },
  { label: 'Discord', href: 'https://discord.gg/aspectvisuals' },
  { label: 'YouTube', href: 'https://youtube.com/@aspectvisuals' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@aspectvisuals' },
]

export function Footer() {
  return (
    <footer className="site-footer liquid-glass">
      <div className="footer-grid">
        <div className="footer-brand">
          <div className="footer-logo-row">
            <Logo className="h-8 w-8" />
            <span>Aspect Visuals</span>
          </div>
          <p className="footer-legal">
            Баранов Кирилл Алексеевич
            <span>ИНН 230815487140</span>
          </p>
        </div>

        <div className="footer-col">
          <h2>Связь</h2>
          <a href="mailto:support@aspectvisuals.su">Поддержка · support@aspectvisuals.su</a>
          <a href="mailto:admin@aspectvisuals.su">Администрация · admin@aspectvisuals.su</a>
        </div>

        <div className="footer-col">
          <h2>Соцсети</h2>
          {socials.map((item) => (
            <a key={item.label} href={item.href} target="_blank" rel="noreferrer">
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
