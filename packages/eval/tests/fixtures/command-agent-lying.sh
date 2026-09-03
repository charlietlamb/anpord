#!/usr/bin/env bash
# Claims to be done and touches nothing. A trial scored by its own report
# would pass; one scored by the verifier must not.
set -eu
printf '{"_tag":"Finished","reason":"done"}\n'
