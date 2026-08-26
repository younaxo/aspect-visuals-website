import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { shopApi } from '../../api'
import { useCartStore } from '../../store/cartStore'
import { useToastStore } from '../../store/toastStore'
import { Button } from '../Common/Button'

export function MockPayPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const clearCart = useCartStore((state) => state.clearCart)
  const showToast = useToastStore((state) => state.showToast)
  const [busy, setBusy] = useState(false)

  const confirm = async () => {
    if (!orderId) return
    setBusy(true)
    try {
      await shopApi.mockComplete(orderId)
      clearCart()
      showToast('Оплата подтверждена', 'success')
      navigate('/account')
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string })?.message
        : 'Не удалось подтвердить оплату'
      showToast(message || 'Не удалось подтвердить оплату', 'error')
      setBusy(false)
    }
  }

  return (
    <section className="content-panel">
      <p className="eyebrow">Тестовая оплата</p>
      <h1 className="page-title">Платёжная страница</h1>
      <p className="page-text">
        Реальные ключи UnitPay/Stripe не заданы. Нажмите кнопку, чтобы подтвердить заказ {orderId}.
      </p>
      <Button disabled={busy} onClick={() => void confirm()}>
        Оплатить
      </Button>
    </section>
  )
}
