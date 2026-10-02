# Dashboard eval pages

A signed in user browses evals: the list at `/evals`, a batch at `/evals/<batchId>`, a case at `/evals/cases/<caseId>`, and a trial's journal at `/evals/cases/<caseId>/trials/<trialId>`.

## Sub-features

- `evals-list` lists recent batches and cases.
- `batch-view` shows every run of a batch with its trials.
- `case-view` shows a case, its variants and runs.
- `trial-view` shows one trial's journal, which can be thousands of events long.

## How to get to it (user POV)

- Sign in and choose Evals in the sidebar, then a batch, a case, or a trial.

## Driving it with puppeteer

Preconditions:

- A seeded server and a built web app you started. `bun run perf web` does all of it and drops its databases and servers, but it rebuilds `apps/web/.output` in each checkout it measures, replacing any build already there; to keep one running, reuse `apps/perf/src/stack/stack.ts` and `apps/perf/src/web/web-server.ts` from a script.
- A Chrome from `launchChrome()` in `apps/perf/src/web/browser.ts`, signed in with `signedInContext()` from the same file, using the `cookie` that `givenTenant()` in `apps/perf/src/stack/tenant.ts` returns.

- **Open a page.** `page.goto("<web>/evals", { waitUntil: "networkidle0" })`. The URL stays on `/evals`; a redirect to `/login` means the cookie did not take.
- **Proof.** `page.screenshot({ path: "<evidence>/evals.png", fullPage: true })` before and after the change, both named in the report.
- **Long journal.** Open the trial the perf seeder writes with 4,000 events. `bun run perf web` reports its heap, DOM nodes and load time.

## Gotchas

- The trial route renders only on the client (`ssr: false`), so wait for the network to go idle before judging it.
- The web server proxies `/api` to the server named by `AUTH_SERVER_URL`, and that server must trust the web origin in `AUTH_TRUSTED_ORIGINS`.
