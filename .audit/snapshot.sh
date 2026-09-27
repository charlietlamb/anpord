#!/usr/bin/env bash
set -uo pipefail
root="$(git rev-parse --show-toplevel)"
out="$(mkdir -p "${1:?usage: snapshot.sh <out-dir>}" && cd "$1" && pwd)"
cd "$root"

bun run openapi >/dev/null
cp apps/docs/openapi.json "$out/openapi.json"
git diff --stat -- apps/docs/openapi.json >"$out/openapi.diffstat"

(cd packages/sdk && bun run build >/dev/null 2>&1)
cli="node packages/sdk/dist/bin.cjs"
strip() { sed -E 's/\x1b\[[0-9;]*m//g'; }
for args in "--help" "eval --help" "eval import --help" "connectors --help" "connectors add --help" "connectors integrations --help" "connectors list --help" "connectors remove --help" "whoami --help"; do
  name="$(echo "$args" | tr ' ' '_')"
  $cli $args >"$out/cli$name.txt" 2>&1
  echo "exit $?" >>"$out/cli$name.txt"
  strip <"$out/cli$name.txt" >"$out/cli$name.tmp" && mv "$out/cli$name.tmp" "$out/cli$name.txt"
done

(cd scripts/fixtures/local-smoke && env -u ANPORD_API_KEY ANPORD_BROWSER=none node "$root/packages/sdk/dist/bin.cjs" eval smoke.eval.ts --local >"$out/local-smoke.txt" 2>&1; echo "exit $?" >>"$out/local-smoke.txt")
strip <"$out/local-smoke.txt" | sed -E 's/[0-9]+ms/Nms/g; s/[0-9.]+s\b/Ns/g' >"$out/local-smoke.tmp" && mv "$out/local-smoke.tmp" "$out/local-smoke.txt"
echo "snapshot of $(git rev-parse --short HEAD) written to $out"
