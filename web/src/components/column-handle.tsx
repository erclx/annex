'use client'

import { type PointerEvent, useRef } from 'react'

import { COLUMN_MAX, COLUMN_MIN } from '@/lib/column-bounds'

const KEY_STEP = 20

interface ColumnHandleProps {
  width: number
  onWidthChange: (width: number) => void
  onReset: () => void
}

/**
 * The divider between the answer column and the Act, as a separator a reader
 * can drag, step with the arrow keys, or return to the default with a
 * double-click or Enter, so the default stays in reach from the keyboard.
 *
 * A drag follows how far the pointer moved from where it was pressed rather
 * than where the pointer sits, so grabbing the handle anywhere across its width
 * never jumps the column. The store clamps the result, which keeps the range in
 * one place.
 */
export function ColumnHandle({
  width,
  onWidthChange,
  onReset,
}: ColumnHandleProps) {
  const drag = useRef<{ startX: number; startWidth: number } | null>(null)

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    drag.current = { startX: event.clientX, startWidth: width }
    const element = event.currentTarget
    if (typeof element.setPointerCapture === 'function')
      element.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (drag.current === null) return
    onWidthChange(drag.current.startWidth + event.clientX - drag.current.startX)
  }

  function handlePointerEnd() {
    drag.current = null
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the answer and the Act"
      aria-valuenow={width}
      aria-valuemin={COLUMN_MIN}
      aria-valuemax={COLUMN_MAX}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          onWidthChange(width - KEY_STEP)
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          onWidthChange(width + KEY_STEP)
        }
        if (event.key === 'Enter') {
          event.preventDefault()
          onReset()
        }
      }}
      onDoubleClick={onReset}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      className="group flex h-full w-full cursor-col-resize touch-none justify-center"
    >
      <span className="h-full w-px bg-rule group-hover:bg-accent group-focus-visible:bg-accent" />
    </div>
  )
}
