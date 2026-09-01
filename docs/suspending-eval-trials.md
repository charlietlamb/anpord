# Suspending eval trials

Why a trial polls for its command rather than holding a stream open, measured
against Trigger.dev before the sandbox port was changed to allow it.

## What was measured

| | wall | billed |
| --- | --- | --- |
| `await sleep(90s)` | 90.0s | 90.0s |
| `wait.for(90s)` | 90.7s | 0.4s |
| Daytona command across a suspension | 130s | 3.0s |

A blocking await bills the whole wait, so a trial that holds a stream open for
a thirteen-minute install pays for thirteen minutes of compute to do nothing. A
suspension does not, and a Daytona session command keeps running while the task
is suspended: reattaching by sandbox id afterwards returns exit code 0 and the
command's stdout.

## What follows from it

A trial has to be able to stop and be picked up again at every point it waits.
That is why `SandboxHandle` exposes `start` and `progress` alongside `exec`:
`exec` is a stream that must be held, and `start` returns an id that outlives
the process that asked for it.

`Suspender` is the seam. In this server it sleeps, which is the behaviour the
stream had. Under a durable runner it would suspend instead, and nothing above
it changes.

Only Daytona implements the pair; `not-resumable.ts` refuses it for the rest,
so a provider that cannot do this says so rather than appearing to work.
