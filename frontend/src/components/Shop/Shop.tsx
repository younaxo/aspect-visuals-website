import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { shopApi } from '../../api'
import { cartItemFromProduct, cartItemFromSubscription, useCartStore } from '../../store/cartStore'
import { useToastStore } from '../../store/toastStore'
import { useAuth } from '../../hooks/useAuth'
import type { ShopProduct, ShopSubscription } from '../../types'
import { Button } from '../Common/Button'
import { ProductCard } from './ProductCard'
import { SubscriptionCard } from './SubscriptionCard'

type Filter = 'all' | 'BASIC' | 'PREMIUM' | 'LIFETIME' | 'PRODUCTS'

export function Shop() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const addItem = useCartStore((state) => state.addItem)
  const cartCount = useCartStore((state) => state.items.length)
  const showToast = useToastStore((state) => state.showToast)
  const [filter, setFilter] = useState<Filter>('all')
  const [confirmItem, setConfirmItem] = useState<ShopSubscription | ShopProduct | null>(null)
  const [confirmKind, setConfirmKind] = useState<'subscription' | 'product'>('subscription')

  const subsQuery = useQuery({
    queryKey: ['shop', 'subscriptions'],
    queryFn: async () => {
      const { data } = await shopApi.subscriptions()
      return (data as { subscriptions: ShopSubscription[] }).subscriptions
    },
  })

  const productsQuery = useQuery({
    queryKey: ['shop', 'products'],
    queryFn: async () => {
      const { data } = await shopApi.products()
      return (data as { products: ShopProduct[] }).products
    },
  })

  const subscriptions = useMemo(() => {
    const items = subsQuery.data ?? []
    if (filter === 'all' || filter === 'PRODUCTS') return items
    if (filter === 'LIFETIME') return items.filter((item) => item.duration === 0 || item.type === 'LIFETIME')
    return items.filter((item) => item.type === filter)
  }, [subsQuery.data, filter])

  const products = productsQuery.data ?? []

  const add = (item: ShopSubscription | ShopProduct, kind: 'subscription' | 'product') => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    addItem(kind === 'subscription' ? cartItemFromSubscription(item as ShopSubscription) : cartItemFromProduct(item as ShopProduct))
    showToast('Добавлено в корзину', 'success')
    setConfirmItem(null)
  }

  return (
    <section className="shop-page">
      <header className="shop-hero content-panel">
        <p className="eyebrow">Магазин</p>
        <h1 className="page-title">Подписки и товары</h1>
        <p className="page-text">Цены в рублях. После оплаты роль в Discord выдаётся автоматически, если она задана у тарифа.</p>
        <Link to="/shop/cart" className="btn-ghost">
          Корзина{cartCount ? ` (${cartCount})` : ''}
        </Link>
      </header>

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

      {filter !== 'PRODUCTS' && (
        <div className="shop-grid">
          {subscriptions.map((item) => (
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
      )}

      {(filter === 'all' || filter === 'PRODUCTS') && (
        <>
          <h2 className="shop-section-title">Дополнительно</h2>
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

      {confirmItem && (
        <div className="shop-modal-backdrop" role="presentation" onClick={() => setConfirmItem(null)}>
          <div className="shop-modal" role="dialog" onClick={(event) => event.stopPropagation()}>
            <h2>Добавить в корзину?</h2>
            <p>
              {confirmItem.name} — {confirmItem.price} ₽
            </p>
            <div className="shop-modal-actions">
              <Button onClick={() => add(confirmItem, confirmKind)}>Купить</Button>
              <Button variant="ghost" onClick={() => setConfirmItem(null)}>
                Отмена
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
