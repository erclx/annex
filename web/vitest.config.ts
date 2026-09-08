import path from 'node:path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    // jsdom rather than node because this is the first branch to render a
    // component. `src/test/setup.ts` has existed since the scaffold, imports
    // jest-dom, and was wired into nothing, so every matcher it registers was
    // unreachable until here.
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    exclude: ['node_modules/**', 'e2e/**', '.next/**'],
  },
})
