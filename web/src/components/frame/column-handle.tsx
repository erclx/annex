'use client'

import { type PointerEvent, useRef } from 'react'

import { COLUMN_MAX, COLUMN_MIN } from '@/lib/browser/column-bounds'

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
 *
 * The line carries a grip so the divider reads as draggable before the pointer
 * finds it, per the operator's second-use pass. Hover darkens the line and the
 * grip in neutral ink rather than accent, since a first draft that turned the
 * whole line accent on hover read as a much larger change than a grip
 * deserves; accent is reserved for keyboard focus, which needs the stronger
 * signal since a keyboard reader cannot see a hover cursor at all.
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
      className="group relative flex h-full w-full cursor-col-resize touch-none justify-center"
    >
      <span className="h-full w-px bg-rule group-hover:bg-cite-rule group-focus-visible:bg-accent" />
      <span
        aria-hidden="true"
        className="absolute top-1/2 flex h-10 w-[10px] -translate-y-1/2 flex-col items-center justify-center gap-[3px] rounded-[5px] border border-cite-rule bg-surface group-hover:border-ink group-focus-visible:border-accent group-focus-visible:ring-2 group-focus-visible:ring-accent"
      >
        <span className="size-[3px] rounded-full bg-cite-rule group-hover:bg-ink group-focus-visible:bg-accent" />
        <span className="size-[3px] rounded-full bg-cite-rule group-hover:bg-ink group-focus-visible:bg-accent" />
        <span className="size-[3px] rounded-full bg-cite-rule group-hover:bg-ink group-focus-visible:bg-accent" />
      </span>
    </div>
  )
}
