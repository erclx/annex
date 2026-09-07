import { defineConfig, devices } from '@playwright/test'

// `scripts/worktree-port.sh` derives a per-worktree offset and the e2e scripts
// export it, so two worktrees of this repository never serve on one port. The
// base is overridable on its own so a single run can be moved off 4100.
const BASE = Number(process.env.E2E_BASE_PORT ?? 4100)
const OFFSET = Number(process.env.WORKTREE_PORT_OFFSET ?? 0)
const PORT = String(BASE + OFFSET)
const BASE_URL = `http://localhost:${PORT}`

// The deployed build answers from committed fixtures rather than the service,
// and the flag that decides it is read at module scope, so the two builds
// cannot be one server. `replay.spec.ts` addresses this one by absolute URL.
//
// It is the static export rather than a second dev server, for two reasons.
// Next 16 refuses a second `next dev` out of one directory whatever port it is
// given, and the export is what the deploy actually uploads, so testing it
// tests the artifact rather than a development stand-in. The cost is a
// production build at the head of the run.
const REPLAY_PORT = String(BASE + OFFSET + 1)
export const REPLAY_URL = `http://localhost:${REPLAY_PORT}`

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
  webServer: [
    {
      command: `bun run dev --port ${PORT}`,
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `NEXT_PUBLIC_ANNEX_MODE=replay bun run build && cd out && python3 -m http.server ${REPLAY_PORT}`,
      url: REPLAY_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
})
