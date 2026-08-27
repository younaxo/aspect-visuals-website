import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { bonusApi } from '../../api'
import { Button } from '../Common/Button'
import { Loader } from '../Common/Loader'
import { useToastStore } from '../../store/toastStore'
import type { DailyBonusClaimResult, DailyBonusState } from '../../types'

function errorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message
    if (message) return message
  }
  return fallback
}

export function DailyBonus() {
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.showToast)

  const bonusQuery = useQuery({
    queryKey: ['bonus', 'daily'],
    queryFn: async () => {
      const { data } = await bonusApi.dailyStatus()
      return data as DailyBonusState
    },
  })

  const claim = useMutation({
    mutationFn: async () => {
      const { data } = await bonusApi.claimDaily()
      return data as DailyBonusClaimResult
    },
    onSuccess: async (data) => {
      showToast(`Начислено ${data.claimedAmount} ₽ на баланс`, 'success')
      // Бонус меняет баланс, поэтому обновляем и профиль
      await queryClient.invalidateQueries({ queryKey: ['bonus'] })
      await queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: async (error) => {
      showToast(errorMessage(error, 'Не удалось получить бонус'), 'error')
      await queryClient.invalidateQueries({ queryKey: ['bonus'] })
    },
  })

  const bonus = bonusQuery.data

  return (
    <div className="account-panel">
      <p className="activate-crumb">Главная / Мой аккаунт / Ежедневный бонус</p>
      <h1 className="page-title">Ежедневный бонус</h1>
      <p className="page-text">Заходите каждый день и забирайте награду за активность.</p>

      {bonusQuery.isPending && <Loader label="Загружаем бонус…" />}

      {bonusQuery.isError && (
        <article className="lib-card">
          <p className="page-text">{errorMessage(bonusQuery.error, 'Не удалось загрузить бонус')}</p>
          <Button variant="ghost" onClick={() => void bonusQuery.refetch()}>
            Повторить
          </Button>
        </article>
      )}

      {bonus && (
        <article className="lib-card">
          <p>Награда сегодня</p>
          <strong>{bonus.amount} ₽ на баланс</strong>
          <p className="page-text">
            {bonus.available
              ? 'Можно забрать прямо сейчас.'
              : bonus.nextAvailableAt
                ? `Следующий бонус будет доступен ${formatDistanceToNow(new Date(bonus.nextAvailableAt), {
                    addSuffix: true,
                    locale: ru,
                  })}.`
                : `Следующий бонус будет доступен через ${bonus.cooldownHours} ч.`}
          </p>
          <p className="page-text">Текущий баланс: {bonus.balance} ₽</p>
          <Button disabled={!bonus.available || claim.isPending} onClick={() => claim.mutate()}>
            {claim.isPending ? 'Забираем…' : bonus.available ? 'Забрать бонус' : 'Уже получено'}
          </Button>
        </article>
      )}
    </div>
  )
}
