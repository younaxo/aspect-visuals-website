import type { ShopSubscription } from '../../types'

interface SubscriptionCardProps {
  item: ShopSubscription
  onSelect: (item: ShopSubscription) => void
}

function durationLabel(days: number): string {
  if (days <= 0) return 'Навсегда'
  if (days % 30 === 0) return `${days / 30} мес.`
  return `${days} дн.`
}

export function SubscriptionCard({ item, onSelect }: SubscriptionCardProps) {
  return (
    <article className={`shop-lib-card ${item.popular ? 'is-popular' : ''}`}>
      {item.badge && <span className="shop-badge">{item.badge}</span>}
      <p className="shop-lib-title">{item.name}</p>
      <p className="shop-lib-meta">
        {item.price} ₽ · {durationLabel(item.duration)}
      </p>
      <p className="shop-lib-desc">{item.description}</p>
      <button type="button" className="shop-lib-btn" onClick={() => onSelect(item)}>
        Выбрать
      </button>
    </article>
  )
}
