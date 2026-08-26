import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  delayMs?: number
}

const OFFSET = 14
const EDGE = 8

function clampToViewport(x: number, y: number, width: number, height: number) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  return {
    left: Math.min(Math.max(EDGE, x), vw - width - EDGE),
    top: Math.min(Math.max(EDGE, y), vh - height - EDGE),
  }
}

export function Tooltip({ content, children, delayMs = 180 }: TooltipProps) {
  const tipId = useId()
  const tipRef = useRef<HTMLDivElement | null>(null)
  const timerRef = useRef<number | null>(null)
  const cursorRef = useRef({ x: 0, y: 0 })
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<CSSProperties>({ opacity: 0 })

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const placeAtCursor = () => {
    const tip = tipRef.current
    if (!tip) return
    const rect = tip.getBoundingClientRect()
    let left = cursorRef.current.x + OFFSET
    let top = cursorRef.current.y + OFFSET
    if (left + rect.width > window.innerWidth - EDGE) {
      left = cursorRef.current.x - rect.width - OFFSET
    }
    if (top + rect.height > window.innerHeight - EDGE) {
      top = cursorRef.current.y - rect.height - OFFSET
    }
    const placed = clampToViewport(left, top, rect.width, rect.height)
    setCoords({
      position: 'fixed',
      top: placed.top,
      left: placed.left,
      opacity: 1,
      zIndex: 10000,
      pointerEvents: 'none',
    })
  }

  const show = (event: MouseEvent | FocusEvent) => {
    if ('clientX' in event && event.clientX) {
      cursorRef.current = { x: event.clientX, y: event.clientY }
    } else {
      const target = event.currentTarget as HTMLElement
      const box = target.getBoundingClientRect()
      cursorRef.current = { x: box.left + box.width / 2, y: box.top + box.height / 2 }
    }
    clearTimer()
    timerRef.current = window.setTimeout(() => setOpen(true), delayMs)
  }

  const hide = () => {
    clearTimer()
    setOpen(false)
    setCoords({ opacity: 0 })
  }

  const onMove = (event: MouseEvent) => {
    cursorRef.current = { x: event.clientX, y: event.clientY }
    if (open) placeAtCursor()
  }

  useEffect(() => {
    if (!open) return
    placeAtCursor()
  }, [open, content])

  useEffect(() => () => clearTimer(), [])

  if (content == null || content === '') return <>{children}</>

  return (
    <>
      <span
        className="tooltip-anchor"
        tabIndex={0}
        aria-describedby={open ? tipId : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onMouseMove={onMove}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {open &&
        createPortal(
          <div id={tipId} ref={tipRef} role="tooltip" className="ui-tooltip" style={coords}>
            {content}
          </div>,
          document.body,
        )}
    </>
  )
}
