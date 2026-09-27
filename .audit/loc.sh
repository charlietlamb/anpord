#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
rev="${1:-HEAD}"
git ls-tree -r --name-only "$rev" -- apps packages scripts \
  | grep -E '\.(ts|tsx|mjs|js)$' \
  | grep -vE '(^|/)(dist|node_modules)/|routeTree\.gen\.ts$|^apps/docs/' \
  | while read -r f; do
      pkg="$(echo "$f" | awk -F/ '{print (NF > 2) ? $1 "/" $2 : $1}')"
      n="$(git show "$rev:$f" | grep -cv '^[[:space:]]*$' || true)"
      echo "$pkg $n"
    done \
  | awk '{s[$1]+=$2; t+=$2} END {for (k in s) printf "%s\t%d\n", k, s[k]; printf "TOTAL\t%d\n", t}' \
  | sort
