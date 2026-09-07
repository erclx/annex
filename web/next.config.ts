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

const nextConfig: NextConfig = {
  // Next regenerates AGENTS.md and CLAUDE.md in this folder on every run. The
  // root CLAUDE.md governs this repository, and a second one under web/ is
  // loaded alongside it and competes with it.
  agentRules: false,
  ...(replaying ? { output: 'export' as const } : {}),
}

export default nextConfig
