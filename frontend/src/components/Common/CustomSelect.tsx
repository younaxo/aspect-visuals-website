import { useEffect, useId, useRef, useState } from 'react'

export interface SelectOption {
  value: string
  label: string
}

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  disabled?: boolean
  className?: string
  placeholder?: string
}

export function CustomSelect({
  value,
  onChange,
  options,
  disabled,
  className = '',
  placeholder = 'Выберите',
}: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected = options.find((item) => item.value === value)

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div className={`custom-select ${open ? 'is-open' : ''} ${className}`} ref={rootRef}>
      <button
        type="button"
        className="custom-select-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{selected?.label || placeholder}</span>
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul className="custom-select-list" id={listId} role="listbox">
          {options.map((item) => (
            <li key={item.value}>
              <button
                type="button"
                role="option"
                aria-selected={item.value === value}
                className={`custom-select-option ${item.value === value ? 'is-active' : ''}`}
                onClick={() => {
                  onChange(item.value)
                  setOpen(false)
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
