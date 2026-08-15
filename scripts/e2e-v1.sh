#!/usr/bin/env bash
# End-to-end check of the public API, its OAuth discovery, and the MCP server.
# Everything here is unauthenticated or uses a key you pass in, so it is safe
# to point at production.
#
#   ANPORD_API_KEY=anp_... bash scripts/e2e-v1.sh
#   API=https://api.anpord.com MCP=https://mcp.anpord.com bash scripts/e2e-v1.sh

set -u

API="${API:-http://127.0.0.1:3003}"
MCP="${MCP:-http://127.0.0.1:3010}"
KEY="${ANPORD_API_KEY:-}"
J='content-type: application/json'

pass=0
fail=0
skip=0

check() { # name expected actual [detail]
  if [ "$2" = "$3" ]; then
    echo "PASS  $1 ($3)"
    pass=$((pass + 1))
  else
    echo "FAIL  $1 — expected $2 got $3 ${4:-}"
    fail=$((fail + 1))
  fi
}

contains() { # name needle haystack
  case "$3" in
    *"$2"*) echo "PASS  $1"; pass=$((pass + 1)) ;;
    *) echo "FAIL  $1 — no '$2' in: $(printf '%.90s' "$3")"; fail=$((fail + 1)) ;;
  esac
}

status() { curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$@"; }
body() { curl -s --max-time 20 "$@"; }

echo "--- discovery (MCP specification) ---"
check "authorization server metadata" 200 \
  "$(status "$API/.well-known/oauth-authorization-server")"
check "protected resource metadata" 200 \
  "$(status "$API/.well-known/oauth-protected-resource")"

meta=$(body "$API/.well-known/oauth-authorization-server")
contains "advertises PKCE S256" 'S256' "$meta"
contains "advertises dynamic registration" 'registration_endpoint' "$meta"
contains "advertises a token endpoint" 'token_endpoint' "$meta"

resource=$(body "$API/.well-known/oauth-protected-resource")
contains "names an authorization server" 'authorization_servers' "$resource"

echo "--- unauthenticated access is refused ---"
check "no credential" 401 \
  "$(status -X POST "$API/v1/prompts.list" -H "$J" -d '{}')"
check "made-up credential" 401 \
  "$(status -X POST "$API/v1/prompts.list" -H "$J" \
    -H 'authorization: Bearer not-a-real-token' -d '{}')"

challenge=$(curl -s -D- -o /dev/null --max-time 20 -X POST "$API/v1/prompts.list" \
  -H "$J" -d '{}' | tr -d '\r' | grep -i '^www-authenticate' || true)
contains "401 points at the resource metadata" 'resource_metadata' "$challenge"

echo "--- MCP server ---"
mcp_status=$(status "$MCP/mcp")
if [ "$mcp_status" = "000" ]; then
  echo "SKIP  MCP not reachable at $MCP"
  skip=$((skip + 1))
else
  check "refuses an anonymous connection" 401 "$mcp_status"
  mcp_challenge=$(curl -s -D- -o /dev/null --max-time 20 "$MCP/mcp" \
    | tr -d '\r' | grep -i '^www-authenticate' || true)
  contains "MCP 401 points at its metadata" 'resource_metadata' "$mcp_challenge"
fi

echo "--- authenticated reads ---"
if [ -z "$KEY" ]; then
  echo "SKIP  set ANPORD_API_KEY to check authenticated calls"
  skip=$((skip + 1))
else
  auth="authorization: Bearer $KEY"
  check "prompts.list" 200 \
    "$(status -X POST "$API/v1/prompts.list" -H "$J" -H "$auth" -d '{}')"

  list=$(body -X POST "$API/v1/prompts.list" -H "$J" -H "$auth" -d '{}')
  contains "returns a data array" '"data"' "$list"

  id=$(printf '%s' "$list" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)
  if [ -n "$id" ]; then
    check "prompts.get resolves production" 200 \
      "$(status -X POST "$API/v1/prompts.get" -H "$J" -H "$auth" \
        --data-raw "{\"id\":\"$id\"}")"

    prompt=$(body -X POST "$API/v1/prompts.get" -H "$J" -H "$auth" \
      --data-raw "{\"id\":\"$id\"}")
    contains "names the channel that answered" '"channel":"production"' "$prompt"

    history=$(body -X POST "$API/v1/prompts.get" -H "$J" -H "$auth" \
      --data-raw "{\"id\":\"$id\",\"includeVersions\":true}")
    contains "history is included on request" '"versions"' "$history"

    check "an unknown prompt is 404" 404 \
      "$(status -X POST "$API/v1/prompts.get" -H "$J" -H "$auth" \
        --data-raw '{"id":"definitely-not-a-prompt"}')"

    check "a malformed id is rejected" 400 \
      "$(status -X POST "$API/v1/prompts.get" -H "$J" -H "$auth" \
        --data-raw '{"id":"NOT A VALID ID"}')"
  else
    echo "SKIP  no prompt to read"
    skip=$((skip + 1))
  fi
fi

echo
echo "$pass passed, $fail failed, $skip skipped"
[ "$fail" -eq 0 ]
