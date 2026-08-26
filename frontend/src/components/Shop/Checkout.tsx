import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCartStore } from '../../store/cartStore'
import { PaymentModal } from './PaymentModal'
import { Button } from '../Common/Button'

export function Checkout() {
  const items = useCartStore((state) => state.items)
  const promoCode = useCartStore((state) => state.promoCode)
  const promoDiscount = useCartStore((state) => state.promoDiscount)
  const subtotal = useCartStore((state) => state.subtotal())
  const total = useCartStore((state) => state.getTotalWithDiscount())
  const [open, setOpen] = useState(false)
  const [params] = useSearchParams()
  const paid = params.get('paid') === '1'

  if (paid) {
    return (
      <section className="content-panel">
        <h1 className="page-title">Оплата принята</h1>
        <p className="page-text">Подписка появится в профиле после подтверждения платежа.</p>
        <Link to="/account" className="btn-primary">
          К подпискам
        </Link>
      </section>
    )
  }

  return (
    <section className="content-panel shop-cart">
      <p className="eyebrow">Оплата</p>
      <h1 className="page-title">Подтверждение заказа</h1>
      {items.length === 0 ? (
        <p className="page-text">
          Нечего оплачивать. <Link to="/shop">В магазин</Link>
        </p>
      ) : (
        <>
          <ul className="cart-list">
            {items.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="cart-item">
                <strong>{item.name}</strong>
                <span>{item.price} ₽</span>
              </li>
            ))}
          </ul>
          {promoCode && promoDiscount > 0 && (
            <p className="page-text">
              Промокод {promoCode}: −{promoDiscount} ₽ (с {subtotal} ₽)
            </p>
          )}
          <p className="shop-total">Итого со скидкой: {total} ₽</p>
          <p className="page-text">UnitPay или Stripe. Если ключи не заданы, откроется тестовая оплата.</p>
          <Button onClick={() => setOpen(true)}>Оплатить</Button>
        </>
      )}
      {open && <PaymentModal amount={total} onClose={() => setOpen(false)} />}
    </section>
  )
}
