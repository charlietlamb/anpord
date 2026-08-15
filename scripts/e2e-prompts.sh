#!/usr/bin/env bash
# End-to-end check of the prompts API through the web proxy.
# Requires the dev servers running and a session whose org is active:
#   ANPORD_SESSION_COOKIE='anpord.session_token=...' bash scripts/e2e-prompts.sh

set -u
C="${ANPORD_SESSION_COOKIE:?set ANPORD_SESSION_COOKIE to a signed-in session cookie}"
B=http://localhost:3005/api/prompts
J='content-type: application/json'
ID="e2e-$(date +%s)"
pass=0; fail=0
check() { # name expected actual [body]
  if [ "$2" = "$3" ]; then echo "PASS  $1 ($3)"; pass=$((pass+1));
  else echo "FAIL  $1 — expected $2 got $3 ${4:-}"; fail=$((fail+1)); fi
}
req() { curl -s -o /tmp/b.json -w '%{http_code}' -b "$C" -H "$J" "$@"; }

echo "--- create ---"
code=$(req -X POST "$B" --data-raw "{\"content\":\"You are helping {{name}}.\",\"id\":\"$ID\",\"name\":\"E2E Prompt\"}")
check "POST /prompts" 200 "$code" "$(head -c 150 /tmp/b.json)"
V1=$(python3 -c "import json;print(json.load(open('/tmp/b.json')).get('version',''))" 2>/dev/null)
CH=$(python3 -c "import json;print(json.load(open('/tmp/b.json')).get('channel',''))" 2>/dev/null)
check "  → version 1" "1" "$V1"
check "  → published to production" "production" "$CH"

echo "--- read ---"
code=$(req "$B"); check "GET /prompts" 200 "$code"
N=$(python3 -c "import json;print(len(json.load(open('/tmp/b.json'))))")
check "  → list contains it" "1" "$N"
code=$(req "$B/$ID"); check "GET /prompts/:id" 200 "$code" "$(head -c 120 /tmp/b.json)"

echo "--- versions ---"
code=$(req -X POST "$B/$ID/versions" --data-raw '{"content":"You are helping {{name}} politely.","commitMessage":"politer"}')
check "POST /prompts/:id/versions" 200 "$code" "$(head -c 150 /tmp/b.json)"
V2=$(python3 -c "import json;print(json.load(open('/tmp/b.json')).get('version',''))")
check "  → version 2" "2" "$V2"
code=$(req "$B/$ID/versions"); check "GET /prompts/:id/versions" 200 "$code"
NV=$(python3 -c "import json;print(len(json.load(open('/tmp/b.json'))))")
check "  → two versions" "2" "$NV"

echo "--- unpublished v2 not live ---"
req "$B/$ID" >/dev/null
LIVE=$(python3 -c "import json;print(json.load(open('/tmp/b.json')).get('version',''))")
check "production still v1" "1" "$LIVE"
code=$(req "$B/$ID?channel=latest"); LATEST=$(python3 -c "import json;print(json.load(open('/tmp/b.json')).get('version',''))")
check "?channel=latest is v2" "2" "$LATEST"
code=$(req "$B/$ID?version=1"); PIN=$(python3 -c "import json;print(json.load(open('/tmp/b.json')).get('version',''))")
check "?version=1 pins v1" "1" "$PIN"

echo "--- deploy ---"
code=$(req -X PUT "$B/$ID/channels" --data-raw '{"channel":"production","version":2}')
check "PUT /prompts/:id/channels" 204 "$code" "$(head -c 120 /tmp/b.json)"
req "$B/$ID" >/dev/null; NOW=$(python3 -c "import json;print(json.load(open('/tmp/b.json')).get('version',''))")
check "  → production is v2 (cache invalidated)" "2" "$NOW"
code=$(req -X PUT "$B/$ID/channels" --data-raw '{"channel":"production","version":1}')
req "$B/$ID" >/dev/null; BACK=$(python3 -c "import json;print(json.load(open('/tmp/b.json')).get('version',''))")
check "  → rollback to v1" "1" "$BACK"

echo "--- update ---"
NEWID="${ID}-renamed"
code=$(req -X PATCH "$B/$ID" --data-raw "{\"id\":\"$NEWID\",\"name\":\"Renamed\"}")
check "PATCH /prompts/:id" 204 "$code" "$(head -c 120 /tmp/b.json)"
code=$(req "$B/$NEWID"); check "  → resolves under new id" 200 "$code"
code=$(req "$B/$ID"); check "  → old id gone" 404 "$code"
code=$(req "$B/$NEWID/versions"); NV2=$(python3 -c "import json;print(len(json.load(open('/tmp/b.json'))))")
check "  → versions survived rename" "2" "$NV2"

echo "--- errors ---"
code=$(req -X POST "$B" --data-raw "{\"content\":\"x\",\"id\":\"$NEWID\",\"name\":\"dup\"}")
check "duplicate id → 409" 409 "$code" "$(head -c 100 /tmp/b.json)"
code=$(req "$B/does-not-exist"); check "missing prompt → 404" 404 "$code"
code=$(req "$B/$NEWID?version=99"); check "missing version → 404" 404 "$code"
code=$(req -X POST "$B" --data-raw '{"content":"x","id":"BAD ID!!","name":"n"}')
check "invalid id → 400" 400 "$code" "$(head -c 100 /tmp/b.json)"
code=$(curl -s -o /dev/null -w '%{http_code}' -H "$J" "$B"); check "no session → 401" 401 "$code"

echo "--- archive ---"
code=$(req -X DELETE "$B/$NEWID"); check "DELETE /prompts/:id" 204 "$code"
code=$(req "$B/$NEWID"); check "  → archived is gone" 404 "$code"

echo "--- health ---"
code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3003/api/healthz); check "GET /api/healthz" 200 "$code"

echo
echo "PASSED: $pass   FAILED: $fail"
