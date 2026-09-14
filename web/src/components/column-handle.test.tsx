import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ColumnHandle } from '@/components/column-handle'

function renderHandle() {
  const props = {
    width: 640,
    onWidthChange: vi.fn(),
    onReset: vi.fn(),
  }
  render(<ColumnHandle {...props} />)
  return props
}

describe('ColumnHandle', () => {
  it('should announce itself as a vertical separator carrying its range', () => {
    renderHandle()

    const handle = screen.getByRole('separator', {
      name: 'Resize the answer and the Act',
    })
    expect(handle).toHaveAttribute('aria-orientation', 'vertical')
    expect(handle).toHaveAttribute('aria-valuenow', '640')
    expect(handle).toHaveAttribute('aria-valuemin', '480')
    expect(handle).toHaveAttribute('aria-valuemax', '760')
  })

  it('should narrow the answer by 20 pixels on the left arrow', async () => {
    const { onWidthChange } = renderHandle()

    screen.getByRole('separator').focus()
    await userEvent.keyboard('{ArrowLeft}')

    expect(onWidthChange).toHaveBeenCalledWith(620)
  })

  it('should widen the answer by 20 pixels on the right arrow', async () => {
    const { onWidthChange } = renderHandle()

    screen.getByRole('separator').focus()
    await userEvent.keyboard('{ArrowRight}')

    expect(onWidthChange).toHaveBeenCalledWith(660)
  })

  it('should reset the split on a double-click', async () => {
    const { onReset } = renderHandle()

    await userEvent.dblClick(screen.getByRole('separator'))

    expect(onReset).toHaveBeenCalled()
  })

  it('should reset the split on Enter for a reader on the keyboard', async () => {
    const { onReset } = renderHandle()

    screen.getByRole('separator').focus()
    await userEvent.keyboard('{Enter}')

    expect(onReset).toHaveBeenCalled()
  })

  it('should follow the pointer from the answer column edge while dragging', () => {
    const { onWidthChange } = renderHandle()
    const handle = screen.getByRole('separator')

    fireEvent.pointerDown(handle, { clientX: 672, pointerId: 1 })
    fireEvent.pointerMove(handle, { clientX: 552, pointerId: 1 })

    expect(onWidthChange).toHaveBeenLastCalledWith(520)
  })

  it('should stop following the pointer once it is released', () => {
    const { onWidthChange } = renderHandle()
    const handle = screen.getByRole('separator')

    fireEvent.pointerDown(handle, { clientX: 672, pointerId: 1 })
    fireEvent.pointerUp(handle, { clientX: 672, pointerId: 1 })
    fireEvent.pointerMove(handle, { clientX: 552, pointerId: 1 })

    expect(onWidthChange).not.toHaveBeenCalled()
  })

  it('should give the line a hit area wider than the line itself', () => {
    renderHandle()

    const handle = screen.getByRole('separator')
    const line = handle.querySelector('span')

    expect(handle).toHaveClass('w-full')
    expect(line).toHaveClass('w-px')
  })

  it('should darken the grip in neutral ink on hover, never in accent', () => {
    renderHandle()

    const handle = screen.getByRole('separator')
    const grip = handle.querySelector('[aria-hidden="true"]')

    expect(grip).toHaveClass('group-hover:border-ink')
    const hoverClasses = grip?.className
      .split(' ')
      .filter((className) => className.startsWith('group-hover:'))
    expect(
      hoverClasses?.some((className) => className.includes('accent')),
    ).toBe(false)
  })

  it('should reserve accent for keyboard focus rather than hover', () => {
    renderHandle()

    const handle = screen.getByRole('separator')
    const grip = handle.querySelector('[aria-hidden="true"]')

    expect(grip).toHaveClass('group-focus-visible:border-accent')
    expect(grip).toHaveClass('group-focus-visible:ring-accent')
  })
})
