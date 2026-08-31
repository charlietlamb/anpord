# Trigger.dev spike

Throwaway. Answers whether Trigger.dev can run an eval trial, before
committing to it.

    cd spike/trigger
    npm install
    npx trigger.dev@latest login --profile anpord
    npx trigger.dev@latest dev --profile anpord

`slow-prepare` sleeps, then reports wall time against CPU time. A long
prepare only works if waiting does not spend the CPU budget maxDuration
counts.

## What it measured

| | wall | billed |
| --- | --- | --- |
| `await sleep(90s)` | 90.0s | 90.0s |
| `wait.for(90s)` | 90.7s | 0.4s |
| Daytona command across a suspension | 130s | 3.0s |

A blocking await bills the whole wait. Suspending does not, and a Daytona
session command keeps running while the task is suspended: reattaching by
sandbox id returns exit code 0 and the command's stdout.

So a trial must suspend at its wait points rather than block on a stream.
