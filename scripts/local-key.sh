#!/usr/bin/env bash
# Prints the exports needed to point the CLI at your local stack.
#
#   eval "$(bun run local:key)"
#   anpord eval suite.eval.ts --local --ui
#
# Mints against the organization your browser is signed into, so a run opened
# with --ui is one you can actually see. Set ANPORD_TEST_ORG to name another,
# which is created if it does not exist. The server must be running, because
# the key comes from the endpoint the dashboard calls, not from the table.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

# .env.local holds the local overrides and .env the deployed values, so the
# override is read first and a miss falls through rather than reaching for prod.
env_value() {
  for file in .env.local .env; do
    value=$(grep -E "^$1=" "$file" 2>/dev/null | head -1 | cut -d= -f2- || true)
    if [ -n "$value" ]; then
      echo "$value"
      return
    fi
  done
}

database="${DATABASE_URL:-$(env_value DATABASE_URL)}"
secret="${BETTER_AUTH_SECRET:-$(env_value BETTER_AUTH_SECRET)}"
server="${ANPORD_SERVER_URL:-http://localhost:3003}"
web="${ANPORD_WEB_URL:-http://localhost:3005}"

if [ -z "$database" ]; then
  echo "DATABASE_URL is not set and .env does not name one." >&2
  exit 1
fi

if [ -z "$secret" ]; then
  echo "BETTER_AUTH_SECRET is not set and .env does not name one." >&2
  exit 1
fi

# Any status proves something is listening; the routes themselves need auth.
if ! curl -sS -o /dev/null --max-time 3 "$server" 2>/dev/null; then
  echo "Nothing is answering on $server. Start it with: bun run dev" >&2
  exit 1
fi

# A batch is only visible to the organization that owns it, so this defaults to
# the one the browser is already signed into rather than a fresh one whose runs
# would 404 in the dashboard.
signed_in=$(
  psql "$database" -tAc "select o.slug
     from session s
     join organization o on o.id = s.active_organization_id
    where s.expires_at > now()
    order by s.updated_at desc
    limit 1" 2>/dev/null | tr -d '[:space:]'
)

slug="${ANPORD_TEST_ORG:-${signed_in:-local-tests}}"

if [ -z "$signed_in" ] || [ -n "${ANPORD_TEST_ORG:-}" ]; then
  DATABASE_URL="$database" bun run scripts/test-org.ts --slug "$slug" >/dev/null
fi

key=$(
  DATABASE_URL="$database" \
  BETTER_AUTH_SECRET="$secret" \
  ANPORD_SERVER_URL="$server" \
  ANPORD_WEB_URL="$web" \
  bun run scripts/mint-api-key.ts --org "$slug" --name local 2>/dev/null
)

if [ -z "$key" ]; then
  echo "The server refused to mint a key for $slug." >&2
  exit 1
fi

echo "export ANPORD_API_KEY=$key"
echo "export ANPORD_BASE_URL=$server"
echo "export ANPORD_WEB_URL=$web"
# The dashboard session lives in Chrome, so --ui opens there rather than in
# whichever browser this machine happens to default to.
echo "export ANPORD_BROWSER=\"${ANPORD_BROWSER:-Google Chrome}\""
