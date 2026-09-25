#!/bin/bash
echo '{"_tag":"Started","sessionId":"watch","model":"'"$ANPORD_MODEL"'"}'
printf '{"_tag":"Message","role":"user","text":"Set up the project and verify it."}\n'
sleep 4
printf '{"_tag":"Message","role":"assistant","text":"Looking at what is here first."}\n'
sleep 4
printf '{"_tag":"Command","command":"ls -a","exitCode":0,"output":"."}\n'
sleep 4
printf '{"_tag":"Command","command":"mkdir -p src","exitCode":0,"output":""}\n'
sleep 4
printf '{"_tag":"Message","role":"assistant","text":"Writing hello.txt now."}\n'
echo hello > "$ANPORD_WORKSPACE/hello.txt"
sleep 4
printf '{"_tag":"Command","command":"echo hello > hello.txt","exitCode":0,"output":""}\n'
sleep 4
printf '{"_tag":"Message","role":"assistant","text":"Done. hello.txt is in place."}\n'
echo '{"_tag":"Finished","reason":"done"}'
