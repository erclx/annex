import { afterEach, describe, expect, it } from 'vitest'

import { COLUMN_STORAGE_KEY } from '@/lib/column-bounds'
import { APPLY_STORED_CHOICES } from '@/lib/stored-choices'

function runScript() {
  // The script ships as a string into the document head, so the test runs
  // that same string rather than a copy of its logic.
  new Function(APPLY_STORED_CHOICES)()
}

function appliedWidth() {
  return document.documentElement.style.getPropertyValue('--annex-answer-width')
}

afterEach(() => {
  localStorage.clear()
  document.documentElement.style.removeProperty('--annex-answer-width')
  delete document.documentElement.dataset.theme
})

describe('APPLY_STORED_CHOICES', () => {
  it('should apply a stored width inside the range as it is', () => {
    localStorage.setItem(COLUMN_STORAGE_KEY, '560')

    runScript()

    expect(appliedWidth()).toBe('560px')
  })

  it('should clamp a stored width past the range the way the store does', () => {
    localStorage.setItem(COLUMN_STORAGE_KEY, '900')

    runScript()

    expect(appliedWidth()).toBe('760px')
  })

  it('should leave the width unset when nothing is stored', () => {
    runScript()

    expect(appliedWidth()).toBe('')
  })

  it('should apply a stored theme', () => {
    localStorage.setItem('annex-theme', 'dark')

    runScript()

    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
