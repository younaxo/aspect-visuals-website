import { useEffect, useRef, useState } from 'react'
import { useToastStore, type ToastItem, type ToastType } from '../../store/toastStore'
import { APPLE_EMOJI } from '../../utils/emoji'

const ICONS: Record<ToastType, string> = {
  success: APPLE_EMOJI.checkMark,
  error: APPLE_EMOJI.crossMark,
  warning: APPLE_EMOJI.warning,
  info: APPLE_EMOJI.information,
  primary: APPLE_EMOJI.star,
  neutral: APPLE_EMOJI.whiteCircle,
}

interface ToastCardProps {
  item: ToastItem
  onDismiss: (id: string) => void
}

function ToastCard({ item, onDismiss }: ToastCardProps) {
  const [hiding, setHiding] = useState(false)
  const timeoutRef = useRef<number | null>(null)
  const remainingRef = useRef(item.duration)
  const startedRef = useRef(Date.now())
  const progressRef = useRef<HTMLDivElement | null>(null)

  const clearTimer = () => {
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  const startTimer = (ms: number) => {
    clearTimer()
    startedRef.current = Date.now()
    remainingRef.current = ms
    timeoutRef.current = window.setTimeout(() => {
      setHiding(true)
      window.setTimeout(() => onDismiss(item.id), 420)
    }, ms)
  }

  useEffect(() => {
    startTimer(item.duration)
    return clearTimer
  }, [item.id, item.duration])

  const onEnter = () => {
    clearTimer()
    remainingRef.current = Math.max(120, remainingRef.current - (Date.now() - startedRef.current))
    if (progressRef.current) progressRef.current.style.animationPlayState = 'paused'
  }

  const onLeave = () => {
    const left = remainingRef.current
    if (progressRef.current) {
      const bar = progressRef.current
      bar.style.animation = 'none'
      void bar.offsetWidth
      bar.style.animation = ''
      bar.style.animationDuration = `${left}ms`
      bar.style.animationPlayState = 'running'
    }
    startTimer(left)
  }

  return (
    <div
      className={`toast toast-${item.type}${hiding ? ' hide' : ''}`}
      role="status"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={() => {
        setHiding(true)
        window.setTimeout(() => onDismiss(item.id), 420)
      }}
    >
      <div className="toast-body">
        <span className="toast-icon" aria-hidden="true">
          <img className="apple-emoji" src={ICONS[item.type]} alt="" width={26} height={26} draggable={false} />
        </span>
        <div className="toast-content">
          <div className="toast-title">{item.title}</div>
          <div className="toast-message">{item.message}</div>
        </div>
      </div>
      <div
        ref={progressRef}
        className="toast-progress"
        style={{ animationDuration: `${item.duration}ms` }}
      />
    </div>
  )
}

export function Toast() {
  const { toasts, dismissToast } = useToastStore()

  if (!toasts.length) return null

  return (
    <div className="toast-stack" aria-live="polite" aria-relevant="additions">
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={dismissToast} />
      ))}
    </div>
  )
}
