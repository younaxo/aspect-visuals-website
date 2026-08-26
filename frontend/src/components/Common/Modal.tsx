import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface ModalProps {
  title: string
  children: ReactNode
  onClose: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Modal({ title, children, onClose, size = 'sm', className = '' }: ModalProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="ui-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`ui-modal liquid-glass size-${size} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ui-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ui-modal-head">
          <h2 id="ui-modal-title">{title}</h2>
          <button type="button" className="ui-modal-close" aria-label="Закрыть" onClick={onClose}>
            <svg className="icon" viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="ui-modal-body">{children}</div>
      </div>
    </div>
  )
}
