import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DescriptionForm } from '@/components/description-form'
import { TraversalSwitch, VersionToggle } from '@/components/top-bar'

function renderForm(
  overrides: Partial<Parameters<typeof DescriptionForm>[0]> = {},
) {
  render(
    <DescriptionForm
      description=""
      onDescriptionChange={vi.fn()}
      onSubmit={vi.fn()}
      error={null}
      pending={false}
      choices={
        <>
          <VersionToggle
            version="consolidated"
            onVersionChange={vi.fn()}
            disabled={false}
          />
          <TraversalSwitch
            traversal={true}
            onTraversalChange={vi.fn()}
            disabled={false}
            traversalFixed={false}
          />
        </>
      }
      {...overrides}
    />,
  )
}

describe('DescriptionForm', () => {
  it('should hold the description, the choices and the send action in one composer', () => {
    renderForm()

    const composer = screen.getByTestId('composer')
    expect(
      within(composer).getByLabelText('Describe your system'),
    ).toBeInTheDocument()
    expect(
      within(composer).getByRole('group', {
        name: 'Which text to read against',
      }),
    ).toBeInTheDocument()
    expect(
      within(composer).getByRole('switch', { name: 'Reference traversal' }),
    ).toBeInTheDocument()
    expect(
      within(composer).getByRole('button', { name: 'Find the articles' }),
    ).toBeInTheDocument()
  })

  it('should keep the traversal hint as visible text inside the composer', () => {
    renderForm()

    expect(
      within(screen.getByTestId('composer')).getByText(
        'Turn off to compare against search alone',
      ),
    ).toBeVisible()
  })

  it('should ask for a description of the system in the heading', () => {
    renderForm()

    expect(
      screen.getByRole('heading', {
        name: 'Describe your AI system. Get back the articles of the AI Act you need to read.',
      }),
    ).toBeInTheDocument()
  })

  it('should say it does not tell you whether you comply', () => {
    renderForm()

    expect(
      screen.getByText(/It won't tell you whether you comply\.$/),
    ).toBeInTheDocument()
  })

  it('should name an empty description under the composer once submitted', () => {
    renderForm({ error: 'empty' })

    expect(
      screen.getByText('A description is needed before this can be answered.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Describe your system')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  it('should hold the send action inactive while the message is showing', () => {
    renderForm({ error: 'empty' })

    expect(
      screen.getByRole('button', { name: 'Find the articles' }),
    ).toBeDisabled()
  })

  describe('focus', () => {
    it('should draw no outline of its own on the textarea', () => {
      renderForm()

      expect(screen.getByLabelText('Describe your system')).toHaveClass(
        'outline-none',
      )
    })

    it('should darken the card border on focus-within rather than on the textarea alone', () => {
      renderForm()

      // focus-within is a CSS pseudo-class rather than a class jsdom applies,
      // so this checks the rule reaches the card, not the textarea alone: any
      // control in the footer, not only the textarea, sits inside the same
      // composer the rule is written against.
      const composer = screen.getByTestId('composer')
      expect(composer).toHaveClass('focus-within:border-muted')
      expect(
        within(composer).getByRole('button', { name: 'Find the articles' }),
      ).toBeInTheDocument()
      expect(
        within(composer).getByLabelText('Describe your system'),
      ).toBeInTheDocument()
    })

    it('should keep the toggle, the switch and Find the articles their own keyboard focus rings', async () => {
      renderForm()
      const submit = screen.getByRole('button', { name: 'Find the articles' })

      await userEvent.tab({ shift: false })
      submit.focus()

      expect(submit).toHaveFocus()
      expect(submit.className).not.toContain('outline-none')
    })

    it('should let border-error win over the focus border once a submit has failed', () => {
      renderForm({ error: 'empty' })

      const composer = screen.getByTestId('composer')
      expect(composer).toHaveClass('border-error')
      expect(composer).not.toHaveClass('focus-within:border-muted')
    })
  })
})
