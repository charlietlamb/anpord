#!/bin/bash
steps=${ANPORD_MODEL##*-}
echo '{"_tag":"Started","sessionId":"bench","model":"'"$ANPORD_MODEL"'"}'
for i in $(seq 1 "$steps"); do
  printf '{"_tag":"Message","role":"assistant","text":"Step %s: reading the workspace and writing the report.","usage":{"inputTokens":1200,"outputTokens":80,"totalTokens":1280,"cacheReadTokens":900,"cacheWriteTokens":0}}\n' "$i"
  ls "$ANPORD_WORKSPACE/src" > /dev/null 2>&1
  printf '{"_tag":"Command","command":"ls src","exitCode":0,"output":"f%s.txt"}\n' "$i"
done
echo "hello" > "$ANPORD_WORKSPACE/hello.txt"
echo "done" > "$ANPORD_WORKSPACE/report.txt"
printf '{"_tag":"Command","command":"echo done > report.txt","exitCode":0,"output":""}\n'
echo '{"_tag":"Finished","reason":"done"}'
