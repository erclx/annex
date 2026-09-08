import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Next regenerates AGENTS.md and CLAUDE.md in this folder on every run. The
  // root CLAUDE.md governs this repository, and a second one under web/ is
  // loaded alongside it and competes with it.
  agentRules: false,
}

export default nextConfig
