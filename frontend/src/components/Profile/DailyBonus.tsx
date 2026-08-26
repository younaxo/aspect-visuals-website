import { useMemo, useState } from 'react'
import { Button } from '../Common/Button'
import { useToastStore } from '../../store/toastStore'

const KEY = 'aspect-daily-bonus'

export function DailyBonus() {
  const showToast = useToastStore((state) => state.showToast)
  const [claimedAt, setClaimedAt] = useState<number>(() => Number(localStorage.getItem(KEY) || 0))

  const available = useMemo(() => {
    if (!claimedAt) return true
    return Date.now() - claimedAt >= 24 * 60 * 60 * 1000
  }, [claimedAt])

  const claim = () => {
    const now = Date.now()
    localStorage.setItem(KEY, String(now))
    setClaimedAt(now)
    showToast('Бонус получен. Возвращайтесь завтра.', 'success')
  }

  return (
    <div className="account-panel">
      <p className="activate-crumb">Главная / Мой аккаунт / Ежедневный бонус</p>
      <h1 className="page-title">Ежедневный бонус</h1>
      <p className="page-text">Заходите каждый день и забирайте награду за активность.</p>
      <article className="lib-card">
        <p>Награда сегодня</p>
        <strong>25 ₽ на баланс</strong>
        <p className="page-text">{available ? 'Можно забрать прямо сейчас.' : 'Следующий бонус будет доступен через 24 часа.'}</p>
        <Button disabled={!available} onClick={claim}>
          {available ? 'Забрать бонус' : 'Уже получено'}
        </Button>
      </article>
    </div>
  )
}
