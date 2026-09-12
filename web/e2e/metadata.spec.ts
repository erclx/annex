import { expect, test } from '@playwright/test'

test.describe('the mark and its metadata', () => {
  test('serves the drawn favicon rather than the framework default', async ({
    page,
  }) => {
    await page.goto('/')

    const icon = page.locator('link[rel="icon"][type="image/svg+xml"]')
    await expect(icon).toHaveAttribute('href', '/favicon.svg')

    const response = await page.request.get('/favicon.svg')
    expect(response.status()).toBe(200)
  })

  test('names a social preview image the crawler can reach', async ({
    page,
  }) => {
    await page.goto('/')

    const ogImage = page.locator('meta[property="og:image"]')
    await expect(ogImage).toHaveAttribute('content', /\/og-image\.png$/)

    const response = await page.request.get('/og-image.png')
    expect(response.status()).toBe(200)
  })
})
