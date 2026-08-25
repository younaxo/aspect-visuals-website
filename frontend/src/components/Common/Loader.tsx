import { Logo } from './Logo'

interface LoaderProps {
  label?: string
  progress?: number
}

export function Loader({ label = 'Загрузка…', progress }: LoaderProps) {
  return (
    <div className="loader-overlay" role="status" aria-live="polite">
      <div className="loader-logo">
        <Logo className="h-full w-full" />
      </div>
      <div className="loader-title">ASPECT VISUALS</div>
      <div className="loader-sub">{label}</div>
      {typeof progress === 'number' && (
        <div className="loader-bar">
          <i style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      )}
    </div>
  )
}
