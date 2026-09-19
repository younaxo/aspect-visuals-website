import { useEffect, useState } from 'react'
import axios from 'axios'
import { shopApi } from '../../api'
import { useCartStore } from '../../store/cartStore'
import { useToastStore } from '../../store/toastStore'
import { Button } from '../Common/Button'
import { CustomSelect } from '../Common/CustomSelect'
import { Modal } from '../Common/Modal'

type PaymentMethod = 'rollypay' | 'unitpay' | 'stripe' | 'mock'

const LABELS: Record<PaymentMethod, string> = {
  rollypay: 'Карта, СБП — RollyPay',
  unitpay: 'UnitPay',
  stripe: 'Stripe',
  mock: 'Тестовая оплата',
}

interface PaymentModalProps {
  amount: number
  onClose: () => void
}

export function PaymentModal({ amount, onClose }: PaymentModalProps) {
  const items = useCartStore((state) => state.items)
  const promoCode = useCartStore((state) => state.promoCode)
  const showToast = useToastStore((state) => state.showToast)
  const [methods, setMethods] = useState<PaymentMethod[] | null>(null)
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [busy, setBusy] = useState(false)

  /*
   * Список способов приходит с сервера: касса без ключей провести платёж не
   * может, и предлагать её — значит показывать кнопку, которая всегда
   * возвращает ошибку.
   */
  useEffect(() => {
    let alive = true
    shopApi
      .paymentMethods()
      .then(({ data }) => {
        if (!alive) return
        const list = ((data as { methods?: string[] }).methods || []) as PaymentMethod[]
        const preferred = (data as { preferred?: string }).preferred as PaymentMethod | undefined
        setMethods(list)
        setMethod(preferred && list.includes(preferred) ? preferred : list[0] || null)
      })
      .catch(() => {
        if (alive) setMethods([])
      })
    return () => {
      alive = false
    }
  }, [])

  const pay = async () => {
    if (!method) return
    setBusy(true)
    try {
      const { data } = await shopApi.purchase({
        items: items.map((item) => ({ kind: item.kind, id: item.id })),
        promoCode: promoCode || undefined,
        paymentMethod: method,
      })
      const url = (data as { confirmationUrl: string }).confirmationUrl
      window.location.href = url
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string })?.message
        : 'Не удалось создать платёж'
      showToast(message || 'Не удалось создать платёж', 'error')
      setBusy(false)
    }
  }

  const empty = methods !== null && methods.length === 0

  return (
    <Modal title="Перейти к оплате" onClose={onClose}>
      <p className="page-text">К оплате {amount} ₽</p>

      {empty ? (
        <p className="page-text error-text">
          Приём оплаты сейчас не настроен. Напишите нам на support@aspectvisuals.su.
        </p>
      ) : (
        <label className="profile-field">
          <span>Способ</span>
          <CustomSelect
            value={method || ''}
            onChange={(value) => setMethod(value as PaymentMethod)}
            options={(methods || []).map((value) => ({ value, label: LABELS[value] || value }))}
          />
        </label>
      )}

      <div className="shop-modal-actions">
        <Button disabled={busy || !method} onClick={() => void pay()}>
          {busy ? 'Создаём платёж…' : 'Перейти к оплате'}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Закрыть
        </Button>
      </div>
    </Modal>
  )
}
