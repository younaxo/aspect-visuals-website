import { Link } from 'react-router-dom'
import { DiscordLogin } from './DiscordLogin'

export function LoginDiscordPage() {
  return (
    <section className="auth-page content-panel">
      <h1 className="page-title">Вход через Discord</h1>
      <p className="page-text">
        Вход через Discord доступен только для привязанных аккаунтов. Сначала зарегистрируйтесь по email и
        привяжите Discord в профиле.
      </p>
      <div className="hero-actions">
        <DiscordLogin label="Войти через Discord" />
      </div>
      <p className="auth-links">
        <Link to="/login">Вход по email</Link>
        <Link to="/register">Регистрация</Link>
      </p>
    </section>
  )
}
