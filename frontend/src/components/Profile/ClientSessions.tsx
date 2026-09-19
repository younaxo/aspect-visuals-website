import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { clientApi, type ClientSessionInfo } from '../../api'
import { useToastStore } from '../../store/toastStore'
import { Button } from '../Common/Button'
import { Loader } from '../Common/Loader'

function formatDate(value: string): string {
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ClientSessions() {
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.showToast)

  const sessionsQuery = useQuery({
    queryKey: ['client', 'sessions'],
    queryFn: async () => {
      const { data } = await clientApi.sessions()
      return data.sessions
    },
  })

  const revoke = useMutation({
    mutationFn: (id: string) => clientApi.revoke(id),
    onSuccess: async () => {
      showToast('Подключение отозвано', 'success')
      await queryClient.invalidateQueries({ queryKey: ['client', 'sessions'] })
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string })?.message
        : undefined
      showToast(message || 'Не удалось отозвать подключение', 'error')
    },
  })

  const sessions: ClientSessionInfo[] = sessionsQuery.data ?? []

  return (
    <section className="profile-section client-sessions" aria-label="Подключённые клиенты">
      <p className="activate-crumb">Главная / Мой аккаунт / Подключённые клиенты</p>
      <h2>Подключённые клиенты</h2>
      <p className="page-text">
        Здесь видно, каким копиям Minecraft-клиента Aspect Visuals разрешён доступ к профилю. Отзыв
        действует сразу: клиент потеряет профиль при следующем запросе.
      </p>

      {sessionsQuery.isLoading ? (
        <Loader label="Загружаем подключения…" />
      ) : sessions.length ? (
        <ul className="subscription-list">
          {sessions.map((session) => (
            <li key={session.id} className="subscription-item shop-sub-row">
              <div>
                <strong>
                  {session.label}
                  {session.current ? ' · текущий' : ''}
                </strong>
                <span>
                  Подключён {formatDate(session.startedAt)} · последняя активность{' '}
                  {formatDate(session.lastSeenAt)}
                  {session.expiresAt ? ` · действует до ${formatDate(session.expiresAt)}` : ''}
                </span>
              </div>
              <Button
                variant="ghost"
                onClick={() => revoke.mutate(session.id)}
                disabled={revoke.isPending}
              >
                Отозвать
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="page-text">
          Подключённых клиентов нет. Откройте меню в Minecraft, нажмите «Войти» и подтвердите код на{' '}
          <Link to="/link">странице подключения</Link>.
        </p>
      )}
    </section>
  )
}
