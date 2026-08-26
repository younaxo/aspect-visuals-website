import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { RoleHierarchy } from './RoleHierarchy'
import { KeyActivateBlock } from './KeyActivateBlock'
import { ForgotPasswordModal } from '../Auth/ForgotPasswordModal'

const GREETINGS = [
  'Привет',
  'Здравствуй',
  'Хей',
  'Рад видеть',
  'С возвращением',
  'Йо',
  'Добро пожаловать',
  'Салют',
  'Как жизнь',
  'На связи',
]

export function AccountPanel() {
  const { user: authUser } = useAuth()
  const { profile } = useProfile()
  const user = profile?.user ?? authUser
  const greeting = useMemo(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)], [])
  const [passwordOpen, setPasswordOpen] = useState(false)

  if (!user) {
    return <p className="page-text">Загружаем профиль…</p>
  }

  const uid = user.uid ?? user.discriminator ?? user.id.slice(-6)
  const balance = user.balance ?? 0

  return (
    <div className="account-panel">
      <p className="activate-crumb">Главная / Мой аккаунт / Аккаунт</p>
      <h1 className="activate-hello">
        {greeting}, <span className="hello-nick">{user.username}</span>
      </h1>

      <section className="account-info">
        <h2>Информация о профиле</h2>
        <dl className="account-rows">
          <div>
            <dt>Дата регистрации</dt>
            <dd>{format(new Date(user.createdAt), 'dd.MM.yyyy', { locale: ru })}</dd>
          </div>
          <div>
            <dt>ID</dt>
            <dd>{uid}</dd>
          </div>
          <div>
            <dt>Роли</dt>
            <dd className="account-role">
              <RoleHierarchy roles={user.roles} />
            </dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user.email || 'Не указан'}</dd>
          </div>
          <div>
            <dt>Пароль</dt>
            <dd className="account-password">
              <span>••••••••••</span>
              <button type="button" className="icon-btn" aria-label="Сбросить пароль" onClick={() => setPasswordOpen(true)}>
                <svg className="icon" viewBox="0 0 24 24">
                  <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                </svg>
              </button>
            </dd>
          </div>
          <div>
            <dt>Баланс</dt>
            <dd>{balance} ₽</dd>
          </div>
          <div>
            <dt>HWID</dt>
            <dd>Не привязан</dd>
          </div>
          <div>
            <dt>Discord</dt>
            <dd className={user.discordLinked ? 'is-ok' : ''}>{user.discordLinked ? 'Привязан' : 'Не привязан'}</dd>
          </div>
        </dl>
      </section>

      <KeyActivateBlock />

      {passwordOpen && (
        <ForgotPasswordModal defaultEmail={user.email ?? ''} onClose={() => setPasswordOpen(false)} />
      )}
    </div>
  )
}
