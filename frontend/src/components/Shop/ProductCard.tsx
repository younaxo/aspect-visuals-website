import type { ShopProduct } from '../../types'
import { Button } from '../Common/Button'

interface ProductCardProps {
  item: ShopProduct
  onBuy: (item: ShopProduct) => void
}

const TYPE_LABEL: Record<string, string> = {
  BETA: 'Бета',
  HWID_RESET: 'HWID',
  SKIN: 'Скин',
}

export function ProductCard({ item, onBuy }: ProductCardProps) {
  return (
    <article className="shop-card">
      <span className="shop-badge muted">{TYPE_LABEL[item.type] || item.type}</span>
      <h3>{item.name}</h3>
      <p className="shop-price">{item.price} ₽</p>
      <p className="shop-desc">{item.description}</p>
      <Button onClick={() => onBuy(item)}>Купить</Button>
    </article>
  )
}
