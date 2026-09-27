#!/usr/bin/env bash
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
scratch="${1:?usage: gates.sh <scratch database url>}"
echo "gates at $(git rev-parse --short HEAD), worktree $(git status --porcelain | grep -c . || true) uncommitted paths"
run() {
  local label="$1"; shift
  "$@" >/tmp/o2-gate.log 2>&1
  local code=$?
  echo "$label: exit $code ($*)"
  grep -aE "Tasks:|error TS|Checked|Comment discipline|Migrations are|Unused|scenarios passed|Ran [0-9]+ tests| fail$" /tmp/o2-gate.log | sed -E 's/\x1b\[[0-9;]*m//g; s/^/  /' | sort -u | head -40
}
run typecheck bunx turbo run typecheck
run check bun run check
run comments bun run check:comments
run knip bun run knip
run biome bunx biome check apps packages scripts
run tests env EVAL_REQUIRE_DATABASE=1 EVAL_TEST_DATABASE_URL="$scratch" DATABASE_URL="$scratch" bunx turbo run test --force --concurrency=1
run e2e bun run e2e -- --stop
