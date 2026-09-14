import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TopBar } from '@/components/frame/top-bar'

const navigation = vi.hoisted(() => ({ pathname: '/' }))

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
}))

function renderBar(overrides: Partial<Parameters<typeof TopBar>[0]> = {}) {
  render(
    <TopBar
      traversal={true}
      onTraversalChange={vi.fn()}
      disabled={false}
      {...overrides}
    />,
  )
}

class SilentResizeObserver {
  observe() {
    return undefined
  }
  disconnect() {
    return undefined
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  navigation.pathname = '/'
})

describe('TopBar', () => {
  it('should publish its height at mount rather than waiting on the observer', () => {
    vi.stubGlobal('ResizeObserver', SilentResizeObserver)

    renderBar()

    expect(
      document.documentElement.style.getPropertyValue('--annex-bar-height'),
    ).toMatch(/^\d+px$/)
  })

  it('should link home and open the evaluation in-site, with the repository as a labelled icon', () => {
    renderBar()

    const home = screen.getByRole('link', { name: 'Home' })
    expect(home).toHaveAttribute('href', '/')
    expect(home).toHaveAttribute('aria-current', 'page')

    const evaluation = screen.getByRole('link', { name: 'Evaluation' })
    expect(evaluation).toHaveAttribute('href', '/evaluation')
    expect(evaluation).not.toHaveAttribute('aria-current')

    const repository = screen.getByRole('link', {
      name: 'Repository on GitHub',
    })
    expect(repository).toHaveAttribute('href', 'https://github.com/erclx/annex')
  })

  it('should mark the evaluation link current on that route', () => {
    navigation.pathname = '/evaluation'
    renderBar()

    expect(screen.getByRole('link', { name: 'Evaluation' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('should mark neither link current on the ask route', () => {
    navigation.pathname = '/ask'
    renderBar()

    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute(
      'aria-current',
    )
    expect(
      screen.getByRole('link', { name: 'Evaluation' }),
    ).not.toHaveAttribute('aria-current')
  })

  it('should say what turning traversal off compares on the live build', () => {
    renderBar()

    expect(
      screen.getByText('Turn off to compare against search alone'),
    ).toBeInTheDocument()
  })

  it('should say the recording was taken with traversal on', () => {
    renderBar({ traversalFixed: true })

    expect(screen.getByText('Recorded with traversal on')).toBeInTheDocument()
  })

  it('should carry no demo or recorded chip beside the switch', () => {
    renderBar()

    expect(screen.queryByText(/^demo$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^recorded$/i)).not.toBeInTheDocument()
  })

  it('should link the mark and the name to the empty page', () => {
    renderBar()

    expect(screen.getByRole('link', { name: 'Annex home' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('should keep the links while the traversal switch sits elsewhere', () => {
    renderBar({ showTraversal: false })

    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Repository on GitHub' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('switch', { name: 'Reference traversal' }),
    ).not.toBeInTheDocument()
  })

  it('should draw no version toggle, which the composer and the card carry', () => {
    renderBar()

    expect(
      screen.queryByRole('group', { name: 'Which text to read against' }),
    ).not.toBeInTheDocument()
  })
})
