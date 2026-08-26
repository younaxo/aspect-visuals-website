import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '../../store/cartStore'
import { PromoInput } from './PromoInput'
import { Button } from '../Common/Button'

export function Cart() {
  const navigate = useNavigate()
  const items = useCartStore((state) => state.items)
  const removeItem = useCartStore((state) => state.removeItem)
  const promoDiscount = useCartStore((state) => state.promoDiscount)
  const subtotal = useCartStore((state) => state.subtotal())
  const total = useCartStore((state) => state.getTotalWithDiscount())

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

          <PromoInput />
          <p className="page-text">Сумма: {subtotal} ₽</p>
          {promoDiscount > 0 && <p className="page-text">Скидка: −{promoDiscount} ₽</p>}
          <p className="shop-total">Итого: {total} ₽</p>
          <Button onClick={() => navigate('/shop/checkout')}>Оформить заказ</Button>
        </>
      )}
    </section>
  )
}
