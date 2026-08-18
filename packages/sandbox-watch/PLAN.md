# Sandbox watch

Capture what an agent actually did inside a sandbox, durably enough to score it.

## The problem

An eval platform sees the model's tool call and the string that came back. It
does not see whether the command exited non-zero, what the agent wrote, or what
it contacted. Sandbox providers hold that information while the sandbox lives
and discard it when the sandbox dies: Modal does not audit `exec` calls at all,
Daytona's command history dies with the sandbox, Cloudflare keeps seven days,
E2B cannot enumerate a sandbox once it is killed.

So the record has to be made while the sandbox runs, by something inside it.

## What it collects

| Signal | How | Works under |
| --- | --- | --- |
| Commands and exit codes | `BASH_ENV` trap plus a wrapper on the exec path | any |
| Files written | inotify on the workspace | any |
| Code, in order | a git commit per turn, bundled at the end | any |
| Destinations by name | dnsmasq query log | any |
| Request detail | mitmproxy with its CA trusted | cooperative clients only |
| Terminal session | `script --timing` | any |

Two of these are worth calling out. **DNS logging is the coverage floor**: it
needs no capability, survives both isolation models, and names every
destination regardless of protocol or whether the client honours a proxy. **The
proxy is detail, not coverage**: a Go binary with a custom transport, a raw
socket, or a pinned certificate all pass it by.

Deliberately not used: `auditd` (no netlink under gVisor, and it records no exit
codes), eBPF (loads and silently does nothing under gVisor), netfilter `LOG`
(the target does not exist under gVisor).

## Shape

```
sandbox                                    host
┌─────────────────────────────┐
│ anpord watch                │
│  ├ dnsmasq        → dns.log │
│  ├ trap DEBUG     → cmd.log │──── NDJSON ────→ ingest
│  ├ inotify        → fs.log  │      (live)      └─ store
│  └ git            → commits │
│                             │
│ /var/log/anpord/  ──────────┼──── snapshot ───→ artefact
└─────────────────────────────┘      (durable)
```

Streamed while it runs so a fleet view is possible, and written to disk so a
snapshot taken at the end carries the whole session even if the stream broke.

## What it cannot do

The agent can kill the collector or unset a proxy variable. Only the
client-side journal sits outside the sandbox's reach, so that is the
authoritative record and everything in-guest is enrichment. This measures
agents that are behaving, and cannot police one that is not.

`BASH_ENV` covers bash, not a direct `execve` from a Python or Node subprocess,
and the trap fires before the command so it carries no exit code. Commands are
therefore complete only where the agent goes through a shell.

## Provider fit

E2B first: `setStartCmd` runs the collector during the template build and
snapshots the VM with it already running, so it costs nothing at boot, and
Firecracker means every technique above is available. Daytona is the closest
second and keeps a server-side command history of its own. Modal loses the
kernel-level options to gVisor. Vercel runs no entrypoint at all, so the
collector has to be started by the client, but it is the only provider that can
capture network traffic without one.

## Proving it

Docker stands in for the guest while there is no provider key. The isolation
differs, the collection does not: a container has the same kernel interfaces
the collector uses, so what runs here is what ships.

A scenario has to look like real work rather than a demonstration: clone a
repository, edit it, install a dependency, run a test suite that fails, fix it,
run it again, reach a network endpoint that is allowed and one that is not.
Then reconstruct what happened from the capture alone and check it against what
was actually done.
