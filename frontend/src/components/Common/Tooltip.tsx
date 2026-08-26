import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  delayMs?: number
}

const GAP = 10
const EDGE = 8

function placeTooltip(
  anchor: DOMRect,
  tip: DOMRect,
  preferred: 'top' | 'bottom' | 'left' | 'right',
): { top: number; left: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const candidates: Array<'top' | 'bottom' | 'left' | 'right'> = [
    preferred,
    ...(['top', 'bottom', 'left', 'right'] as const).filter((s) => s !== preferred),
  ]

  for (const side of candidates) {
    let top = 0
    let left = 0

    if (side === 'top') {
      top = anchor.top - tip.height - GAP
      left = anchor.left + anchor.width / 2 - tip.width / 2
    } else if (side === 'bottom') {
      top = anchor.bottom + GAP
      left = anchor.left + anchor.width / 2 - tip.width / 2
    } else if (side === 'left') {
      top = anchor.top + anchor.height / 2 - tip.height / 2
      left = anchor.left - tip.width - GAP
    } else {
      top = anchor.top + anchor.height / 2 - tip.height / 2
      left = anchor.right + GAP
    }

    left = Math.min(Math.max(EDGE, left), vw - tip.width - EDGE)
    top = Math.min(Math.max(EDGE, top), vh - tip.height - EDGE)

    if (left >= EDGE - 0.5 && left + tip.width <= vw - EDGE + 0.5 && top >= EDGE - 0.5 && top + tip.height <= vh - EDGE + 0.5) {
      return { top, left }
    }
  }

  return {
    top: Math.min(Math.max(EDGE, preferred === 'bottom' ? anchor.bottom + GAP : anchor.top - tip.height - GAP), vh - tip.height - EDGE),
    left: Math.min(Math.max(EDGE, anchor.left + anchor.width / 2 - tip.width / 2), vw - tip.width - EDGE),
  }
}

export function Tooltip({ content, children, side = 'top', delayMs = 280 }: TooltipProps) {
  const tipId = useId()
  const anchorRef = useRef<HTMLSpanElement | null>(null)
  const tipRef = useRef<HTMLDivElement | null>(null)
  const timerRef = useRef<number | null>(null)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<CSSProperties>({ opacity: 0 })

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const show = () => {
    clearTimer()
    timerRef.current = window.setTimeout(() => setOpen(true), delayMs)
  }

  const hide = () => {
    clearTimer()
    setOpen(false)
  }

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current
    const tip = tipRef.current
    if (!anchor || !tip) return
    const placed = placeTooltip(anchor.getBoundingClientRect(), tip.getBoundingClientRect(), side)
    setCoords({
      position: 'fixed',
      top: placed.top,
      left: placed.left,
      opacity: 1,
      zIndex: 10000,
      pointerEvents: 'none',
    })
  }, [side])

  useEffect(() => {
    if (!open) return
    updatePosition()
    const onScroll = () => updatePosition()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open, updatePosition, content])

  useEffect(() => () => clearTimer(), [])

  if (content == null || content === '') return <>{children}</>

  return (
    <>
      <span
        ref={anchorRef}
        className="tooltip-anchor"
        tabIndex={0}
        aria-describedby={open ? tipId : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
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
