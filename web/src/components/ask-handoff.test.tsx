import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { AskHandoffProvider } from '@/components/ask-handoff'
import { useAskHandoff } from '@/lib/ask-handoff'

function Writer() {
  const { setHandoff } = useAskHandoff()
  return (
    <button
      type="button"
      onClick={() => {
        setHandoff({
          description: 'a customer chatbot',
          version: 'original',
          traversal: false,
        })
      }}
    >
      Write
    </button>
  )
}

function Reader() {
  const { handoff } = useAskHandoff()
  return (
    <output>
      {`${handoff.description}|${handoff.version}|${String(handoff.traversal)}|${String(handoff.rejected)}`}
    </output>
  )
}

describe('AskHandoffProvider', () => {
  it('should read a value written on one consumer back on another', async () => {
    render(
      <AskHandoffProvider>
        <Writer />
        <Reader />
      </AskHandoffProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Write' }))

    expect(screen.getByRole('status')).toHaveTextContent(
      'a customer chatbot|original|false|false',
    )
  })

  it('should read the defaults on a consumer nothing was written for', () => {
    render(
      <AskHandoffProvider>
        <Reader />
      </AskHandoffProvider>,
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      '|consolidated|true|false',
    )
  })

  it('should refuse a consumer rendered outside the provider', () => {
    expect(() => render(<Reader />)).toThrow(/AskHandoffProvider/)
  })
})
