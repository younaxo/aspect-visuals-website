import { format, formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { shopApi } from '../../api'
import { useToastStore } from '../../store/toastStore'
import { useNavigate } from 'react-router-dom'
import type { ShopPurchase, TestSubscriptionInfo, UserShopSubscription } from '../../types'
import { Button } from '../Common/Button'

const STATUS_LABEL: Record<UserShopSubscription['status'], string> = {
  active: 'Активна',
  expiring: 'Скоро истекает',
  expired: 'Истекла',
}

export function MySubscriptions() {
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.showToast)
  const navigate = useNavigate()

  const subsQuery = useQuery({
    queryKey: ['shop', 'mine'],
    queryFn: async () => {
      const { data } = await shopApi.mySubscriptions()
      return data as { subscriptions: UserShopSubscription[]; test: TestSubscriptionInfo }
    },
  })

  const purchasesQuery = useQuery({
    queryKey: ['shop', 'purchases'],
    queryFn: async () => {
      const { data } = await shopApi.myPurchases()
      return (data as { purchases: ShopPurchase[] }).purchases
    },
  })

  const activateTest = useMutation({
    mutationFn: () => shopApi.activateTest(),
    onSuccess: async () => {
      showToast('Тестовая подписка активирована на 1 день', 'success')
      await queryClient.invalidateQueries({ queryKey: ['shop'] })
      await queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (error) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string })?.message
        : 'Не удалось активировать тест'
      showToast(message || 'Не удалось активировать тест', 'error')
    },
  })

  const cancel = useMutation({
    mutationFn: (id: string) => shopApi.cancel(id),
    onSuccess: async () => {
      showToast('Подписка отменена, Discord-роль снята', 'info')
      await queryClient.invalidateQueries({ queryKey: ['shop'] })
    },
  })

  const subscriptions = subsQuery.data?.subscriptions ?? []
  const test = subsQuery.data?.test
  const purchases = purchasesQuery.data ?? []

  return (
    <section className="profile-section" aria-label="Мои подписки">
      <h2>Мои подписки</h2>
      {subscriptions.length ? (
        <ul className="subscription-list">
          {subscriptions.map((item) => (
            <li key={item.id} className="subscription-item shop-sub-row">
              <div>
                <strong>{item.name}</strong>
                <span>
                  {STATUS_LABEL[item.status]}
                  {item.lifetime
                    ? ' · Навсегда'
                    : ` · ${formatDistanceToNow(new Date(item.endDate), { addSuffix: true, locale: ru })}`}
                </span>
              </div>
              <div className="shop-sub-actions">
                {!item.lifetime && item.status !== 'expired' && (
                  <Button variant="ghost" onClick={() => navigate('/shop')}>
                    Продлить
                  </Button>
                )}
                {item.isActive && (
                  <Button variant="ghost" onClick={() => cancel.mutate(item.id)}>
                    Отменить
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="page-text">Нет активных подписок.</p>
      )}

      {test && (
        <div className="test-sub-box">
          <h3>Тестовая подписка</h3>
          <p className="page-text">1 день раз в 3 месяца. Нельзя взять при активной платной подписке.</p>
          {test.lastActivatedAt && (
            <p className="page-text">
              Последняя активация: {format(new Date(test.lastActivatedAt), 'd MMMM yyyy', { locale: ru })}
            </p>
          )}
          {test.nextAvailableAt && (
            <p className="page-text">
              Следующая доступна {formatDistanceToNow(new Date(test.nextAvailableAt), { addSuffix: true, locale: ru })}
            </p>
          )}
          <Button disabled={!test.available || activateTest.isPending} onClick={() => activateTest.mutate()}>
            Активировать тестовую подписку
          </Button>
          {!test.available && test.reason && <p className="page-text">{test.reason}</p>}
        </div>
      )}

      <h3 className="shop-section-title">История покупок</h3>
      {purchases.length ? (
        <ul className="subscription-list">
          {purchases.map((item) => (
            <li key={item.id} className="subscription-item">
              <span>
                {item.name} · {item.amount} ₽
              </span>
              <span>
                {item.status} · {format(new Date(item.createdAt), 'd MMM yyyy', { locale: ru })}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="page-text">Покупок пока нет.</p>
      )}
    </section>
  )
}
