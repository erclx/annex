import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { FailureNextStep } from '@/components/status/failure-next-step'
import { recordedQuestions } from '@/lib/service/replay'

describe('FailureNextStep', () => {
  it('should offer every recorded question beside an unrecorded description', () => {
    render(<FailureNextStep state="unrecorded" onPick={vi.fn()} />)

    expect(
      screen.getByRole('complementary', { name: 'Next step' }),
    ).toHaveTextContent('Recorded questions you can open')
    expect(
      screen.getByRole('button', { name: recordedQuestions[0].description }),
    ).toBeInTheDocument()
  })

  it('should ask the recorded question a pick names', async () => {
    const onPick = vi.fn()
    render(<FailureNextStep state="unrecorded" onPick={onPick} />)

    await userEvent.click(
      screen.getByRole('button', { name: recordedQuestions[0].description }),
    )

    expect(onPick).toHaveBeenCalledWith(recordedQuestions[0].description)
  })

  it('should show the commands that start the model and the service beside an unavailable state', () => {
    render(<FailureNextStep state="unavailable" onPick={vi.fn()} />)

    const pane = screen.getByRole('complementary', { name: 'Next step' })
    expect(pane).toHaveTextContent('Start what is missing')
    expect(pane).toHaveTextContent('ollama serve')
    expect(pane).toHaveTextContent('uv run python -m annex serve')
  })

  it('should show the command that starts the service beside an unreachable state', () => {
    render(<FailureNextStep state="unreachable" onPick={vi.fn()} />)

    const pane = screen.getByRole('complementary', { name: 'Next step' })
    expect(pane).toHaveTextContent('The service, from python/')
    expect(pane).toHaveTextContent('uv run python -m annex serve')
  })
})
