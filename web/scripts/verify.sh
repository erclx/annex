#!/bin/bash
set -e
set -o pipefail

cd "$(dirname "$0")/.."

command -v bun >/dev/null 2>&1 || {
  echo "bun is not installed"
  exit 1
}

# src/lib/answer.ts is generated from the Python schema and committed. Regenerating
# and diffing here is what stops it drifting: a schema change nobody regenerated
# against fails the gate instead of surfacing as a runtime shape mismatch later.
# Compare the file against its own regeneration rather than against git. A git-based
# check answers the wrong question: it reports nothing for a file git does not track,
# and it fails on the very commit that first adds one. What matters is whether the
# committed output still matches what the current schema produces.
GENERATED=src/lib/answer.ts
before=$(sha256sum "$GENERATED" 2>/dev/null | cut -d' ' -f1 || true)
bun run generate:answer
after=$(sha256sum "$GENERATED" | cut -d' ' -f1)

if [ "$before" != "$after" ]; then
  echo "$GENERATED was stale against python/schema/answer.schema.json and has been regenerated."
  echo "Review the change and commit it."
  git --no-pager diff -- "$GENERATED"
  exit 1
fi

bun run check:format
# Route types are generated, gitignored, and absent from a fresh checkout,
# where tsc would otherwise fail on the LayoutProps global the app router uses.
bun run typegen
bun run typecheck
bun run lint
bun run test:run
