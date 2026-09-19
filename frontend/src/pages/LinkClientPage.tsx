import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { clientApi, type DeviceAuthorizationInfo } from '../api'
import { Button } from '../components/Common/Button'
import { Loader } from '../components/Common/Loader'
import { useAuth } from '../hooks/useAuth'

type Stage = 'input' | 'loading' | 'confirm' | 'approved' | 'denied' | 'error'

function normalize(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
}

function pretty(value: string): string {
  const code = normalize(value)
  return code.length > 4 ? `${code.slice(0, 4)}-${code.slice(4)}` : code
}

function errorText(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string })?.message || fallback
  }
  return fallback
}

export function LinkClientPage() {
  const [params] = useSearchParams()
  const { isAuthenticated, isLoading } = useAuth()

  const [code, setCode] = useState(() => normalize(params.get('code') ?? ''))
  const [stage, setStage] = useState<Stage>('input')
  const [request, setRequest] = useState<DeviceAuthorizationInfo | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  // Код из ссылки клиента подставляется сам, но подтверждение всё равно ручное
  useEffect(() => {
    const fromLink = normalize(params.get('code') ?? '')
    if (fromLink.length === 8 && isAuthenticated) {
      void lookup(fromLink)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  async function lookup(value: string) {
    setStage('loading')
    setMessage('')
    try {
      const { data } = await clientApi.device(value)
      setRequest(data)
      if (data.status === 'PENDING') {
        setStage('confirm')
      } else if (data.status === 'APPROVED') {
        setStage('approved')
      } else if (data.status === 'DENIED') {
        setStage('denied')
      } else {
        setStage('error')
        setMessage('Срок действия кода истёк. Запросите новый в клиенте.')
      }
    } catch (error) {
      setStage('error')
      setMessage(errorText(error, 'Код не найден'))
    }
  }

  async function decide(approve: boolean) {
    setBusy(true)
    try {
      if (approve) {
        await clientApi.approve(code)
        setStage('approved')
      } else {
        await clientApi.deny(code)
        setStage('denied')
      }
      setMessage('')
    } catch (error) {
      setStage('error')
      setMessage(errorText(error, 'Не удалось обработать код'))
    } finally {
      setBusy(false)
    }
  }

  if (isLoading) {
    return <Loader label="Проверяем сессию…" />
  }

  if (!isAuthenticated) {
    return (
      <section className="auth-page content-panel">
        <h1 className="page-title">Подключение клиента</h1>
        <p className="page-text">
          Чтобы подтвердить вход Aspect Visuals в Minecraft, сначала войдите в аккаунт на сайте.
        </p>
        <p className="auth-links">
          <Link to="/login">Войти</Link>
        </p>
      </section>
    )
  }

  return (
    <section className="auth-page content-panel link-client">
      <h1 className="page-title">Подключение клиента</h1>

      {stage === 'input' && (
        <form
          className="link-client-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (normalize(code).length === 8) {
              void lookup(normalize(code))
            }
          }}
        >
          <p className="page-text">Введите код, который показал Minecraft-клиент Aspect Visuals.</p>
          <input
            className="link-client-code"
            value={pretty(code)}
            onChange={(event) => setCode(normalize(event.target.value))}
            placeholder="XXXX-XXXX"
            autoComplete="off"
            spellCheck={false}
            aria-label="Код подключения"
          />
          <Button type="submit" disabled={normalize(code).length !== 8}>
            Продолжить
          </Button>
        </form>
      )}

      {stage === 'loading' && <Loader label="Ищем запрос…" />}

      {stage === 'confirm' && request && (
        <div className="link-client-confirm">
          <p className="page-text">
            Подтвердите вход в аккаунт Aspect Visuals для приложения ниже. Подтверждайте, только если
            код запросили вы сами.
          </p>
          <dl className="link-client-facts">
            <div>
              <dt>Приложение</dt>
              <dd>
                {request.clientName}
                {request.clientVersion ? ` ${request.clientVersion}` : ''}
              </dd>
            </div>
            <div>
              <dt>Код</dt>
              <dd className="link-client-code-value">{request.userCode}</dd>
            </div>
            <div>
              <dt>Запрошен</dt>
              <dd>{new Date(request.requestedAt).toLocaleString('ru-RU')}</dd>
            </div>
          </dl>
          <p className="page-text link-client-note">
            После подтверждения клиент увидит ваш профиль: ник, аватар и статус подписки. Доступа к
            почте, балансу и платёжным данным у него не будет. Отозвать подключение можно в разделе
            «Подключённые клиенты».
          </p>
          <div className="link-client-actions">
            <Button onClick={() => void decide(true)} disabled={busy}>
              Подтвердить вход
            </Button>
            <Button variant="ghost" onClick={() => void decide(false)} disabled={busy}>
              Отклонить
            </Button>
          </div>
        </div>
      )}

      {stage === 'approved' && (
        <>
          <p className="page-text">Вход подтверждён. Вернитесь в Minecraft — клиент загрузит профиль сам.</p>
          <p className="auth-links">
            <Link to="/account/sessions">Подключённые клиенты</Link>
          </p>
        </>
      )}

      {stage === 'denied' && (
        <>
          <p className="page-text">Запрос отклонён. Клиент не получит доступ к аккаунту.</p>
          <p className="auth-links">
            <Link to="/account">В личный кабинет</Link>
          </p>
        </>
      )}

      {stage === 'error' && (
        <>
          <p className="page-text error-text">{message}</p>
          <Button
            variant="ghost"
            onClick={() => {
              setStage('input')
              setMessage('')
            }}
          >
            Ввести другой код
          </Button>
        </>
      )}
    </section>
  )
}
