interface LoaderProps {
  label?: string
  progress?: number
}

export function Loader({ label = 'Загрузка…', progress }: LoaderProps) {
  return (
    <div className="loader-overlay" role="status" aria-live="polite">
      <div className="loader-logo">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" className="h-full w-full" fill="none">
          <g fill="currentColor">
            <polygon points="238,50 60,420 145,420 238,225" />
            <polygon points="262,50 262,225 355,420 440,420" />
            <polygon points="250,380 180,240 320,240" />
            <polygon points="175,445 325,445 345,465 155,465" />
          </g>
        </svg>
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
