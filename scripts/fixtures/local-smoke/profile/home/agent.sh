#!/bin/bash
echo '{"_tag":"Started","sessionId":"smoke","model":"'"$ANPORD_MODEL"'"}'
printf '{"_tag":"Message","role":"assistant","text":"Writing hello.txt."}\n'
echo hello > "$ANPORD_WORKSPACE/hello.txt"
printf '{"_tag":"Command","command":"echo hello > hello.txt","exitCode":0,"output":""}\n'
echo '{"_tag":"Finished","reason":"done"}'
