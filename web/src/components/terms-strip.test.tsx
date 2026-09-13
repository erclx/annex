import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TermsStrip } from '@/components/terms-strip'

describe('TermsStrip', () => {
  it('should gather the load-bearing terms under one label', () => {
    render(<TermsStrip />)

    expect(screen.getByText('Terms used on this page')).toBeInTheDocument()
    expect(screen.getByText('High risk')).toBeInTheDocument()
  })

  it('should carry no commit hash entry, since the band it glossed is gone', () => {
    render(<TermsStrip />)

    expect(screen.queryByText('Commit hash')).not.toBeInTheDocument()
  })
})
