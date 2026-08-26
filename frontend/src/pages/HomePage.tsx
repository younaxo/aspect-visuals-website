import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function HomePage() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <p className="eyebrow">Minecraft</p>
        <h1 className="hero-title">Aspect Visuals</h1>
        <p className="hero-text">
          Клиент визуалов для Minecraft: вход по email, Discord, подписки и магазин. Тёмная тема с фиолетовым акцентом Aspect.
        </p>
        <div className="hero-actions">
          <Link to="/shop" className="btn-primary">
            Магазин
          </Link>
          {!isAuthenticated && (
            <Link to="/login" className="btn-ghost">
              Войти
            </Link>
          )}
        </div>
      </section>

      <section className="feature-grid" aria-label="Возможности">
        <article className="feature-card">
          <h2>Подписки</h2>
          <p>Базовый и премиум доступ к визуалам Minecraft, ключи и тестовый день раз в три месяца.</p>
        </article>
        <article className="feature-card">
          <h2>Discord</h2>
          <p>Вход через Discord и синхронизация ролей сервера с аккаунтом на сайте.</p>
        </article>
        <article className="feature-card">
          <h2>Магазин</h2>
          <p>Пакеты, допы и промокоды — без лишнего шума, только нужные покупки.</p>
        </article>
      </section>
    </div>
  )
}
