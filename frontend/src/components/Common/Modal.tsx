import type { ReactNode } from 'react'

interface ModalProps {
  title: string
  children: ReactNode
  onClose: () => void
}

export function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div className="ui-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="ui-modal liquid-glass" role="dialog" aria-labelledby="ui-modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="ui-modal-head">
          <h2 id="ui-modal-title">{title}</h2>
          <button type="button" className="ui-modal-close" aria-label="Закрыть" onClick={onClose}>
            <svg className="icon" viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
