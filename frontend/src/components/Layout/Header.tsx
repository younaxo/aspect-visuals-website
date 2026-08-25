import { Button } from '../Common/Button'

interface HeaderProps {
  onMinimize?: () => void
  onMaximize?: () => void
  onClose?: () => void
}

export function Header({ onMinimize, onMaximize, onClose }: HeaderProps) {
  return (
    <header className="flex h-10 shrink-0 items-center justify-between border-b border-white/10 pl-4">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 shrink-0 text-zinc-400">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" className="h-full w-full" fill="none">
            <g fill="currentColor">
              <polygon points="238,50 60,420 145,420 238,225" />
              <polygon points="262,50 262,225 355,420 440,420" />
              <polygon points="250,380 180,240 320,240" />
              <polygon points="175,445 325,445 345,465 155,465" />
            </g>
          </svg>
        </div>
        <span className="text-xs text-zinc-500">Aspect Visuals</span>
      </div>
      <div className="flex">
        <Button variant="window" aria-label="Свернуть" onClick={onMinimize}>
          <svg className="icon icon-sm" viewBox="0 0 24 24">
            <path d="M5 12h14" />
          </svg>
        </Button>
        <Button variant="window" aria-label="Развернуть" onClick={onMaximize}>
          <svg className="icon icon-sm" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        </Button>
        <Button variant="close" aria-label="Закрыть" onClick={onClose}>
          <svg className="icon icon-sm" viewBox="0 0 24 24">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </Button>
      </div>
    </header>
  )
}
