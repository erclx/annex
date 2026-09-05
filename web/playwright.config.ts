import { defineConfig, devices } from '@playwright/test'

// `scripts/worktree-port.sh` derives a per-worktree offset and the e2e scripts
// export it, so two worktrees of this repository never serve on one port. The
// base is overridable on its own so a single run can be moved off 4100.
const BASE = Number(process.env.E2E_BASE_PORT ?? 4100)
const OFFSET = Number(process.env.WORKTREE_PORT_OFFSET ?? 0)
const PORT = String(BASE + OFFSET)
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'html' : 'list',
  workers: 1,
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `bun run dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
