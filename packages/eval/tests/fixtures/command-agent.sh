#!/usr/bin/env bash
# The reference command agent: does one real thing in the workspace and
# reports it in the NDJSON contract. The verifier checks the file, not the
# report, which is the point of having a lying twin beside it.
set -eu
: "${ANPORD_PROMPT:?}" "${ANPORD_WORKSPACE:?}"

cd "$ANPORD_WORKSPACE"

printf '{"_tag":"Message","role":"assistant","text":"Appending the prompt to notes.txt"}\n'
printf '%s\n' "$ANPORD_PROMPT" >> notes.txt
lines=$(wc -l < notes.txt | tr -d ' ')
printf '{"_tag":"Command","command":"wc -l < notes.txt","exitCode":0,"output":"%s"}\n' "$lines"
printf '{"_tag":"FileChange","paths":["%s/notes.txt"]}\n' "$ANPORD_WORKSPACE"
printf '{"_tag":"Usage","inputTokens":12,"outputTokens":4}\n'
printf '{"_tag":"Finished","reason":"done"}\n'
