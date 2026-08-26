import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { shopApi } from '../../api'
import { useCartStore } from '../../store/cartStore'
import { useToastStore } from '../../store/toastStore'
import { Button } from '../Common/Button'

export function Cart() {
  const navigate = useNavigate()
  const items = useCartStore((state) => state.items)
  const removeItem = useCartStore((state) => state.removeItem)
  const applyPromo = useCartStore((state) => state.applyPromo)
  const clearPromo = useCartStore((state) => state.clearPromo)
  const promoCode = useCartStore((state) => state.promoCode)
  const promoDiscount = useCartStore((state) => state.promoDiscount)
  const subtotal = useCartStore((state) => state.subtotal())
  const total = useCartStore((state) => state.total())
  const showToast = useToastStore((state) => state.showToast)
  const [code, setCode] = useState(promoCode)
  const [busy, setBusy] = useState(false)

  const submitPromo = async () => {
    setBusy(true)
    try {
      const { data } = await shopApi.applyPromo(code.trim().toUpperCase(), subtotal)
      const payload = data as { total: number; promo: { code: string } }
      const discount = Math.max(0, subtotal - payload.total)
      applyPromo(payload.promo.code, discount)
      showToast('Промокод применён', 'success')
    } catch (error) {
      clearPromo()
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string })?.message
        : 'Промокод не подошёл'
      showToast(message || 'Промокод не подошёл', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="content-panel shop-cart">
      <p className="eyebrow">Корзина</p>
      <h1 className="page-title">Оформление</h1>

      {items.length === 0 ? (
        <p className="page-text">
          Корзина пуста. <Link to="/shop">Вернуться в магазин</Link>
        </p>
      ) : (
        <>
          <ul className="cart-list">
            {items.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="cart-item">
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.price} ₽</span>
                </div>
                <Button variant="ghost" onClick={() => removeItem(item.id, item.kind)}>
                  Удалить
                </Button>
              </li>
            ))}
          </ul>

          <label className="profile-field">
            <span>Промокод</span>
            <div className="cart-promo">
              <input className="profile-input" value={code} onChange={(event) => setCode(event.target.value)} />
              <Button variant="ghost" disabled={busy} onClick={() => void submitPromo()}>
                Применить
              </Button>
            </div>
          </label>

          {promoDiscount > 0 && <p className="page-text">Скидка: {promoDiscount} ₽</p>}
          <p className="shop-total">Итого: {total} ₽</p>
          <Button onClick={() => navigate('/shop/checkout')}>Оформить заказ</Button>
        </>
      )}
    </section>
  )
}
