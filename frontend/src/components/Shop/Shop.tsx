import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { shopApi } from '../../api'
import { cartItemFromProduct, cartItemFromSubscription, useCartStore } from '../../store/cartStore'
import { useToastStore } from '../../store/toastStore'
import { useAuth } from '../../hooks/useAuth'
import type { ShopProduct, ShopSubscription } from '../../types'
import { ProductCard } from './ProductCard'
import { SubscriptionCard } from './SubscriptionCard'

type Filter = 'all' | 'BASIC' | 'PREMIUM' | 'LIFETIME' | 'PRODUCTS'

function durationKey(item: ShopSubscription) {
  return item.duration <= 0 ? 10_000 : item.duration
}

function sortSubs(items: ShopSubscription[]) {
  return [...items].sort((a, b) => {
    const family = (type: string) => (type === 'PREMIUM' ? 1 : 0)
    return family(a.type) - family(b.type) || durationKey(a) - durationKey(b) || a.price - b.price
  })
}

function isPremium(item: ShopSubscription) {
  return item.type === 'PREMIUM'
}

function isLifetime(item: ShopSubscription) {
  return item.duration <= 0
}

export function Shop() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const addItem = useCartStore((state) => state.addItem)
  const showToast = useToastStore((state) => state.showToast)
  const [filter, setFilter] = useState<Filter>('all')
  const [confirmItem, setConfirmItem] = useState<ShopSubscription | ShopProduct | null>(null)
  const [confirmKind, setConfirmKind] = useState<'subscription' | 'product'>('subscription')

  const subsQuery = useQuery({
    queryKey: ['shop', 'subscriptions'],
    queryFn: async () => {
      const { data } = await shopApi.subscriptions()
      return sortSubs((data as { subscriptions: ShopSubscription[] }).subscriptions)
    },
  })

  const productsQuery = useQuery({
    queryKey: ['shop', 'products'],
    queryFn: async () => {
      const { data } = await shopApi.products()
      const items = (data as { products: ShopProduct[] }).products
      const rank: Record<string, number> = { BETA: 0, HWID_RESET: 1 }
      return [...items].sort((a, b) => (rank[a.type] ?? 9) - (rank[b.type] ?? 9) || a.price - b.price)
    },
  })

  const allSubs = subsQuery.data ?? []
  const basic = useMemo(
    () => allSubs.filter((item) => !isPremium(item) && (filter !== 'LIFETIME' || isLifetime(item))),
    [allSubs, filter],
  )
  const premium = useMemo(
    () => allSubs.filter((item) => isPremium(item) && (filter !== 'LIFETIME' || isLifetime(item))),
    [allSubs, filter],
  )
  const products = productsQuery.data ?? []

  const showBasic = filter === 'all' || filter === 'BASIC' || filter === 'LIFETIME'
  const showPremium = filter === 'all' || filter === 'PREMIUM' || filter === 'LIFETIME'
  const showProducts = filter === 'all' || filter === 'PRODUCTS'

  const add = (item: ShopSubscription | ShopProduct, kind: 'subscription' | 'product') => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    addItem(
      kind === 'subscription'
        ? cartItemFromSubscription(item as ShopSubscription)
        : cartItemFromProduct(item as ShopProduct),
    )
    showToast('Добавлено в корзину', 'success')
    setConfirmItem(null)
  }

  return (
    <section className="shop-page">
      <div className="shop-panel">
        <div className="shop-panel-head">
          <div>
            <p className="eyebrow">Магазин</p>
            <h1 className="shop-panel-title">Пакеты и дополнения</h1>
            <p className="shop-panel-text">Цены в рублях. После оплаты роль в Discord выдаётся, если она задана у тарифа.</p>
          </div>
          <Link to="/shop" className="btn-ghost">
            В магазин
          </Link>
        </div>

        <div className="shop-filters">
          {(
            [
              ['all', 'Все'],
              ['BASIC', 'Базовые'],
              ['PREMIUM', 'Премиум'],
              ['LIFETIME', 'Навсегда'],
              ['PRODUCTS', 'Допы'],
            ] as Array<[Filter, string]>
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`shop-filter ${filter === value ? 'active' : ''}`}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {showBasic && basic.length > 0 && (
          <>
            {filter === 'all' && <h2 className="shop-section-title">Базовые</h2>}
            <div className="shop-grid">
              {basic.map((item) => (
                <SubscriptionCard
                  key={item.id}
                  item={item}
                  onSelect={(selected) => {
                    setConfirmKind('subscription')
                    setConfirmItem(selected)
                  }}
                />
              ))}
            </div>
          </>
        )}

        {showPremium && premium.length > 0 && (
          <>
            {filter === 'all' && <h2 className="shop-section-title">Премиум</h2>}
            <div className="shop-grid">
              {premium.map((item) => (
                <SubscriptionCard
                  key={item.id}
                  item={item}
                  onSelect={(selected) => {
                    setConfirmKind('subscription')
                    setConfirmItem(selected)
                  }}
                />
              ))}
            </div>
          </>
        )}

        {showProducts && (
          <>
            {filter === 'all' && <h2 className="shop-section-title">Дополнительно</h2>}
            <div className="shop-grid">
              {products.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  onBuy={(selected) => {
                    setConfirmKind('product')
                    setConfirmItem(selected)
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {confirmItem && (
        <div className="shop-modal-backdrop" role="presentation" onClick={() => setConfirmItem(null)}>
          <div className="shop-modal" role="dialog" onClick={(event) => event.stopPropagation()}>
            <h2>Добавить в корзину?</h2>
            <p>
              {confirmItem.name} — {confirmItem.price} ₽
            </p>
            <div className="shop-modal-actions">
              <button type="button" className="auth-submit" style={{ marginTop: 0, width: 'auto', padding: '0 18px' }} onClick={() => add(confirmItem, confirmKind)}>
                Купить
              </button>
              <button type="button" className="btn-ghost" onClick={() => setConfirmItem(null)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
