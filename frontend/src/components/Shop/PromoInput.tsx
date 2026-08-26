import { useState } from 'react'
import { useCartStore } from '../../store/cartStore'
import { usePromoStore } from '../../store/promoStore'
import { useToastStore } from '../../store/toastStore'
import { Button } from '../Common/Button'

export function PromoInput() {
  const promoCode = useCartStore((state) => state.promoCode)
  const promoDiscount = useCartStore((state) => state.promoDiscount)
  const subtotal = useCartStore((state) => state.subtotal())
  const applyPromo = usePromoStore((state) => state.applyPromo)
  const removePromo = usePromoStore((state) => state.removePromo)
  const error = usePromoStore((state) => state.error)
  const showToast = useToastStore((state) => state.showToast)
  const [code, setCode] = useState(promoCode)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (promoDiscount > 0 && promoCode) {
      showToast('Промокод нельзя применить поверх другой скидки', 'error')
      return
    }
    setBusy(true)
    const ok = await applyPromo(code, subtotal)
    setBusy(false)
    if (ok) showToast('Промокод успешно применён', 'success')
    else showToast(usePromoStore.getState().error || 'Промокод недействителен', 'error')
  }

  const clear = async () => {
    await removePromo()
    setCode('')
    showToast('Промокод удалён', 'info')
  }

  return (
    <div className="promo-box">
      <label className="profile-field">
        <span>Промокод</span>
        <div className="cart-promo">
          <input
            className="profile-input"
            value={code}
            disabled={promoDiscount > 0}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="SALE30"
          />
          {promoDiscount > 0 ? (
            <Button variant="ghost" onClick={() => void clear()}>
              Удалить
            </Button>
          ) : (
            <Button variant="ghost" disabled={busy || !code.trim()} onClick={() => void submit()}>
              Применить
            </Button>
          )}
        </div>
      </label>
      {promoDiscount > 0 && (
        <p className="promo-ok">Скидка {promoDiscount} ₽ по коду {promoCode}</p>
      )}
      {error && promoDiscount === 0 && <p className="promo-err">{error}</p>}
    </div>
  )
}
