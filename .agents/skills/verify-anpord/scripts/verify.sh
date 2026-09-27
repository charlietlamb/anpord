#!/usr/bin/env bash
set -uo pipefail

ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT" || exit 1

BASE_REF=${BASE_REF:-origin/main}
PERF=${PERF:-full}
SKIP=${SKIP:-}
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
BRANCH=$(git rev-parse --abbrev-ref HEAD | tr '/' '-')
EVIDENCE=${EVIDENCE_DIR:-${TMPDIR:-/tmp}/anpord-verify/$BRANCH-$STAMP}
SCRATCH_DB=anpord_scratch_verify_$$
mkdir -p "$EVIDENCE"

results=()
failed=0

admin_url() {
  local from_env=""
  if [ -f "$ROOT/.env.local" ]; then
    from_env=$(grep -E '^DATABASE_URL=' "$ROOT/.env.local" | head -1 | cut -d= -f2-)
  fi
  local url=${PERF_DATABASE_URL:-${from_env:-postgresql://localhost:5432/postgres}}
  case "$url" in
    *localhost*|*127.0.0.1*) ;;
    *) echo "refusing a non-local database: $url" >&2; return 1 ;;
  esac
  printf '%s' "${url%/*}/postgres"
}

scratch_url() {
  local admin
  admin=$(admin_url) || return 1
  printf '%s' "${admin%/*}/$SCRATCH_DB"
}

drop_scratch() {
  local admin
  admin=$(admin_url) && psql "$admin" -qAtc "drop database if exists $SCRATCH_DB with (force)" >/dev/null 2>&1
}
trap drop_scratch EXIT

step() {
  local name=$1
  shift
  if [[ " $SKIP " == *" $name "* ]]; then
    results+=("SKIP  $name")
    return
  fi
  local log="$EVIDENCE/$name.log"
  local began=$SECONDS
  echo "== $name"
  if "$@" >"$log" 2>&1; then
    results+=("PASS  $name ($((SECONDS - began))s) $(summary_of "$name" "$log")")
  else
    results+=("FAIL  $name ($((SECONDS - began))s) see $log")
    failed=$((failed + 1))
    tail -20 "$log"
  fi
}

summary_of() {
  case "$1" in
    test) grep -hoE '^ *[0-9]+ pass' "$2" | awk '{ s += $1 } END { if (s) printf "%d tests passed", s }' ;;
    e2e) grep -oE '[0-9]+/[0-9]+ scenarios passed' "$2" | tail -1 ;;
    perf) grep -oE '[0-9]+ regressed (in both passes|beyond [0-9.]+%)' "$2" | tail -1 ;;
    *) ;;
  esac
}

route_tree() {
  [ -f apps/web/src/routeTree.gen.ts ] || bun --cwd apps/web run build
}

changed_files() {
  local base
  base=$(git merge-base HEAD "$BASE_REF")
  { git diff --name-only --diff-filter=ACMR "$base"; git ls-files --others --exclude-standard; } |
    sort -u |
    grep -E '\.(ts|tsx|js|mjs|cjs|json|jsonc|css)$' |
    grep -vE '^(\.claude/worktrees|scripts/fixtures|context)/' |
    while read -r file; do [ -f "$file" ] && printf '%s\n' "$file"; done
}

biome_changed() {
  local files
  files=$(changed_files)
  if [ -z "$files" ]; then
    echo "no changed files biome checks"
    return 0
  fi
  echo "$files"
  echo "$files" | xargs bunx biome check
}

tests_on_scratch() {
  local admin url
  admin=$(admin_url) || return 1
  url=$(scratch_url) || return 1
  psql "$admin" -qAtc "drop database if exists $SCRATCH_DB with (force)" &&
    psql "$admin" -qAtc "create database $SCRATCH_DB" &&
    DATABASE_URL=$url bun run db:migrate &&
    EVAL_REQUIRE_DATABASE=1 EVAL_TEST_DATABASE_URL=$url DATABASE_URL=$url bunx turbo run test --force
}

sdk_smoke() {
  bun --cwd packages/sdk run build &&
    env -u ANPORD_API_KEY ANPORD_BROWSER=none bun packages/sdk/dist/bin.cjs eval scripts/fixtures/local-smoke/smoke.eval.ts --local
}

base_checkout() {
  local sha dir
  sha=$(git rev-parse --short "$BASE_REF")
  dir=${TMPDIR:-/tmp}/anpord-verify-base-$sha
  if [ ! -d "$dir" ]; then
    git worktree add --detach "$dir" "$BASE_REF" >&2 && (cd "$dir" && bun install >&2)
  fi
  printf '%s' "$dir"
}

perf_ab() {
  local base
  base=$(base_checkout) || return 1
  local flags=()
  [ "$PERF" = quick ] && flags+=(--quick)
  bun run perf ab all --before "$base" ${flags[@]+"${flags[@]}"}
}

step install bun install
step routes route_tree
step typecheck bun run typecheck
step check bun run check
step comments bun run check:comments
step knip bun run knip
step biome biome_changed
step test tests_on_scratch
step e2e bun run e2e
step sdk-smoke sdk_smoke
if [ "$PERF" = skip ]; then
  results+=("SKIP  perf")
else
  step perf perf_ab
fi

echo
printf '%s\n' "${results[@]}" | tee "$EVIDENCE/summary.txt"
echo "evidence: $EVIDENCE"
exit $((failed > 0))
