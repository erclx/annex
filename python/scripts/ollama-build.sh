#!/usr/bin/env bash
# Build the derived Ollama models this project calls.
#
# The /v1 route ignores a per-request num_ctx, so the context is carried by the
# model itself. Re-run this after changing a Modelfile, and after pulling the
# base model on a new machine.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
modelfiles="$here/../ollama"

if ! command -v ollama >/dev/null 2>&1; then
  echo "ollama is not on PATH. See .claude/context/development.md" >&2
  exit 1
fi

for path in "$modelfiles"/*.Modelfile; do
  name="$(basename "$path" .Modelfile)"
  echo "Building $name from $(basename "$path")"
  ollama create "$name" -f "$path"
done

echo "Done. Verify with: uv run python -m annex context"
