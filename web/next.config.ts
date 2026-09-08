import type { NextConfig } from 'next'

/**
 * `output: 'export'` under the replay flag alone.
 *
 * A local build still calls the service on `4200` and needs a server it can
 * reach, so exporting unconditionally would change how every developer runs
 * this half to buy a deployment nobody runs locally. Only the deployed build
 * sets the flag, and only that build is static.
 *
 * The export needs no path prefix. A Cloudflare custom domain serves at a bare
 * origin, which is what `.claude/context/service.md` records the deploy as.
 */
const replaying = process.env.NEXT_PUBLIC_ANNEX_MODE === 'replay'

/**
 * `ANNEX_DIST_DIR` moves the build directory off the default `.next`.
 *
 * The end-to-end run starts a dev server and a replay build from this one
 * directory at the same time, and both write `.next` unless one is moved. The
 * dev server holds that path, so `playwright.config.ts` sends the build
 * somewhere else rather than letting the two interleave.
 *
 * Under `output: 'export'` the exported site lands in this directory rather
 * than in `out`, which is why the value the run passes reads as an output
 * folder. A build that sets neither variable writes `.next` and exports to
 * `out`, which is what the deploy workflow and the capture script both do.
 */
const distDir = process.env.ANNEX_DIST_DIR

const nextConfig: NextConfig = {
  // Next regenerates AGENTS.md and CLAUDE.md in this folder on every run. The
  // root CLAUDE.md governs this repository, and a second one under web/ is
  // loaded alongside it and competes with it.
  agentRules: false,
  ...(replaying ? { output: 'export' as const } : {}),
  ...(distDir ? { distDir } : {}),
}

export default nextConfig
