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

  test('carries a dark-scheme block so the mark survives a dark tab strip', async ({
    page,
  }) => {
    const response = await page.request.get('/favicon.svg')
    const body = await response.text()

    expect(body).toContain('prefers-color-scheme: dark')
    expect(body).toContain('#EDEBE6')
    expect(body).toContain('#8FB2E0')
  })

  test('names a social preview image the crawler can reach', async ({
    page,
  }) => {
    await page.goto('/')

    const ogImage = page.locator('meta[property="og:image"]')
    await expect(ogImage).toHaveAttribute('content', /\/og-image\.png$/)

    const response = await page.request.get('/og-image.png')
    expect(response.status()).toBe(200)
    const body = await response.body()
    expect(body.byteLength).toBeGreaterThan(0)
  })

  test('serves the alternate card the metadata does not name yet', async ({
    page,
  }) => {
    const response = await page.request.get('/og-image-alt.png')
    expect(response.status()).toBe(200)
    const body = await response.body()
    expect(body.byteLength).toBeGreaterThan(0)
  })
})
