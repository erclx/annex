#!/bin/bash
set -e
set -o pipefail

cd "$(dirname "$0")/.."

command -v bun >/dev/null 2>&1 || {
  echo "bun is not installed"
  exit 1
}

bun run check:format
# Route types are generated, gitignored, and absent from a fresh checkout,
# where tsc would otherwise fail on the LayoutProps global the app router uses.
bun run typegen
bun run typecheck
bun run lint
bun run test:run
