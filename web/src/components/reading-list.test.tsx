import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { CitedProvision } from '@/components/act-reader'
import { ReadingList } from '@/components/reading-list'

function aProvision(
  provisionId: string,
  label: string,
  reachedBy: CitedProvision['reachedBy'],
): CitedProvision {
  return { provisionId, label, reachedBy }
}

const PROVISIONS: CitedProvision[] = [
  aProvision('art_5', 'Article 5', 'walk'),
  aProvision('art_5.1', 'Article 5(1)', 'search'),
  aProvision('art_53', 'Article 53', 'walk'),
  aProvision('art_55.1', 'Article 55(1)', 'search'),
  aProvision('anx_II', 'Annex II', 'walk'),
  aProvision('anx_III', 'Annex III', 'walk'),
]

function renderList(onOpen = vi.fn()) {
  render(<ReadingList provisions={PROVISIONS} openId="art_5" onOpen={onOpen} />)
  return onOpen
}

function rowNames(): string[] {
  return within(screen.getByRole('list', { name: 'Provisions read' }))
    .getAllByRole('button')
    .map((row) => row.textContent ?? '')
}

describe('ReadingList', () => {
  it('should hold the list behind one line naming the count', () => {
    renderList()

    expect(
      screen.getByRole('button', { name: '6 provisions read before refusing' }),
    ).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('should tag each row with whether search or the walk reached it', async () => {
    renderList()

    await userEvent.click(
      screen.getByRole('button', { name: '6 provisions read before refusing' }),
    )

    expect(rowNames()).toContain('Article 5(1)search')
    expect(rowNames()).toContain('Article 53walk')
  })

  it('should match an article number exactly rather than as a prefix', async () => {
    renderList()
    await userEvent.click(
      screen.getByRole('button', { name: '6 provisions read before refusing' }),
    )

    await userEvent.type(screen.getByRole('searchbox'), 'Article 5')

    expect(rowNames()).toEqual(['Article 5walk', 'Article 5(1)search'])
  })

  it('should match an annex numeral exactly', async () => {
    renderList()
    await userEvent.click(
      screen.getByRole('button', { name: '6 provisions read before refusing' }),
    )

    await userEvent.type(screen.getByRole('searchbox'), 'II')

    expect(rowNames()).toEqual(['Annex IIwalk'])
  })

  it('should say nothing matched and offer to clear the filter', async () => {
    renderList()
    await userEvent.click(
      screen.getByRole('button', { name: '6 provisions read before refusing' }),
    )
    await userEvent.type(screen.getByRole('searchbox'), '99')

    await userEvent.click(screen.getByRole('button', { name: 'Clear filter' }))

    expect(rowNames()).toHaveLength(6)
  })

  it('should open, filter and close from the keyboard, returning focus', async () => {
    const user = userEvent.setup()
    renderList()
    const control = screen.getByRole('button', {
      name: '6 provisions read before refusing',
    })

    control.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('searchbox')).toHaveFocus()
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(control).toHaveFocus()
  })

  it('should open the provision a row names', async () => {
    const onOpen = renderList()
    await userEvent.click(
      screen.getByRole('button', { name: '6 provisions read before refusing' }),
    )

    await userEvent.click(screen.getByRole('button', { name: /^Annex III/ }))

    expect(onOpen).toHaveBeenCalledWith('anx_III')
  })
})
