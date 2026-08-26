import { useToastStore, type ToastType } from '../../store/toastStore'

const labels: Record<ToastType, string> = {
  success: 'Успешно',
  error: 'Ошибка',
  warning: 'Внимание',
  info: 'Сообщение',
}

export function Toast() {
  const { toasts, dismissToast } = useToastStore()

  if (!toasts.length) return null

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`toast toast-${item.type}`}
          onClick={() => dismissToast(item.id)}
        >
          <span className="toast-label">{labels[item.type]}</span>
          <span>{item.message}</span>
        </button>
      ))}
    </div>
  )
}
