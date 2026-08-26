import type { ShopSubscription } from '../../types'
import { Button } from '../Common/Button'

interface SubscriptionCardProps {
  item: ShopSubscription
  onSelect: (item: ShopSubscription) => void
}

function durationLabel(days: number): string {
  if (days <= 0) return 'Навсегда'
  if (days === 1) return '1 день'
  if (days % 30 === 0) return `${days / 30} мес.`
  return `${days} дн.`
}

export function SubscriptionCard({ item, onSelect }: SubscriptionCardProps) {
  return (
    <article className={`shop-card ${item.popular ? 'is-popular' : ''}`}>
      {item.badge && <span className="shop-badge">{item.badge}</span>}
      <h3>{item.name}</h3>
      <p className="shop-price">
        {item.price} ₽<span> / {durationLabel(item.duration)}</span>
      </p>
      <p className="shop-desc">{item.description || 'Доступ к клиенту Aspect Visuals'}</p>
      <Button onClick={() => onSelect(item)}>Выбрать</Button>
    </article>
  )
}
