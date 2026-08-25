import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { DiscordLogin } from '../components/Auth/DiscordLogin'

export function HomePage() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="page-stack">
      <section className="hero-panel liquid-glass">
        <p className="eyebrow">Visuals</p>
        <h1 className="hero-title">Aspect Visuals</h1>
        <p className="hero-text">
          Клиент визуалов с Discord-авторизацией, подписками и магазином. Тёмная тема, стекло и аккуратная типографика.
        </p>
        <div className="hero-actions">
          <Link to="/shop" className="btn-primary">
            Магазин
          </Link>
          {!isAuthenticated && <DiscordLogin label="Войти через Discord" />}
        </div>
      </section>

      <section className="feature-grid" aria-label="Возможности">
        <article className="feature-card liquid-glass">
          <h2>Подписки</h2>
          <p>Базовый и премиум доступ, ключи и тестовый день раз в три месяца.</p>
        </article>
        <article className="feature-card liquid-glass">
          <h2>Discord</h2>
          <p>Вход через Discord и синхронизация ролей сервера с аккаунтом на сайте.</p>
        </article>
        <article className="feature-card liquid-glass">
          <h2>Магазин</h2>
          <p>Пакеты, допы и промокоды — без лишнего шума, только нужные покупки.</p>
        </article>
      </section>
    </div>
  )
}
