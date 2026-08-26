import type { ShopProduct } from '../../types'

interface ProductCardProps {
  item: ShopProduct
  onBuy: (item: ShopProduct) => void
}

export function ProductCard({ item, onBuy }: ProductCardProps) {
  return (
    <article className="shop-lib-card">
      <p className="shop-lib-title">{item.name}</p>
      <p className="shop-lib-meta">{item.price} ₽</p>
      <p className="shop-lib-desc">{item.description}</p>
      <button type="button" className="shop-lib-btn" onClick={() => onBuy(item)}>
        Купить
      </button>
    </article>
  )
}
