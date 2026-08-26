import { KeyActivateBlock } from '../Profile/KeyActivateBlock'
import { useAuth } from '../../hooks/useAuth'

export function ActivatePage() {
  const { user } = useAuth()
  return (
    <section className="activate-page">
      <p className="activate-crumb">Главная / Активация ключа</p>
      <h1 className="activate-hello">
        Привет, <span>{user?.username}</span>
      </h1>
      <KeyActivateBlock />
    </section>
  )
}
