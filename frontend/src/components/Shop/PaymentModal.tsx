import { useState } from 'react'
import axios from 'axios'
import { shopApi } from '../../api'
import { useCartStore } from '../../store/cartStore'
import { useToastStore } from '../../store/toastStore'
import { Button } from '../Common/Button'
import { CustomSelect } from '../Common/CustomSelect'
import { Modal } from '../Common/Modal'

interface PaymentModalProps {
  amount: number
  onClose: () => void
}

export function PaymentModal({ amount, onClose }: PaymentModalProps) {
  const items = useCartStore((state) => state.items)
  const promoCode = useCartStore((state) => state.promoCode)
  const showToast = useToastStore((state) => state.showToast)
  const [method, setMethod] = useState<'unitpay' | 'stripe'>('unitpay')
  const [busy, setBusy] = useState(false)

  const pay = async () => {
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

  return (
    <Modal title="Перейти к оплате" onClose={onClose}>
      <p className="page-text">К оплате {amount} ₽</p>
      <label className="profile-field">
        <span>Способ</span>
        <CustomSelect
          value={method}
          onChange={(value) => setMethod(value as 'unitpay' | 'stripe')}
          options={[
            { value: 'unitpay', label: 'UnitPay' },
            { value: 'stripe', label: 'Stripe' },
          ]}
        />
      </label>
      <div className="shop-modal-actions">
        <Button disabled={busy} onClick={() => void pay()}>
          {busy ? 'Создаём платёж…' : 'Перейти к оплате'}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Закрыть
        </Button>
      </div>
    </Modal>
  )
}
