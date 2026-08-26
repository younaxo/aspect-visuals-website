import { useEffect, useId, useMemo, useRef, useState } from 'react'

export interface SelectOption {
  value: string
  label: string
  group?: string
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

  const grouped = useMemo(() => {
    const map = new Map<string, SelectOption[]>()
    for (const option of options) {
      const key = option.group || ''
      const list = map.get(key) ?? []
      list.push(option)
      map.set(key, list)
    }
    return Array.from(map.entries())
  }, [options])

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
        <div className="custom-select-panel liquid-glass" id={listId} role="listbox">
          {grouped.map(([group, items]) => (
            <div key={group || 'root'} className="custom-select-group">
              {group ? <p className="custom-select-group-label">{group}</p> : null}
              <ul className="custom-select-list">
                {items.map((item) => (
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
