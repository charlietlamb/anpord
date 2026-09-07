import { expect, test } from "bun:test";
import type { EvalCellHistoryEntry } from "@anpord/schema/domain/evals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { DateTime } from "effect";
import { renderToStaticMarkup } from "react-dom/server";
import { CellHistory } from "@/components/evals/cell-history";
import { historyResult } from "./cell-history";
import { clock } from "./duration";
import { evalQueries } from "./eval-queries";

const historyEntry = (
  passed: number,
  scored: number,
  voided = 0
): EvalCellHistoryEntry => ({
  runId: "run_current",
  internalId: "cell_current",
  finishedAt: DateTime.unsafeMake("2026-09-06T12:56:00Z"),
  trigger: null,
  harnessVersion: "1.0.0",
  profileVersion: null,
  trials: [],
  distribution: {
    passed,
    scored,
    voided,
    failed: scored - passed,
    trials: scored + voided,
    passRate: scored === 0 ? 0 : passed / scored,
    deterministic: true,
    commandMin: 0,
    commandMax: 0,
    commandMedian: 0,
  },
});

test.each([
  [3, 3, 0, "3/3 passed", "text-success"],
  [1, 3, 0, "1/3 passed", "text-destructive"],
  [0, 0, 2, "Not scored", "text-muted-foreground"],
  [1, 1, 2, "1/1 passed · 2 not scored", "text-muted-foreground"],
] as const)("labels %i/%i scored trials and %i unscored trials", (passed, scored, voided, label, className) => {
  expect(historyResult(historyEntry(passed, scored, voided))).toEqual({
    label,
    className,
  });
});

test("unfinished runs are not presented as final results", () => {
  expect(historyResult({ ...historyEntry(1, 1), finishedAt: null }).label).toBe(
    "Running"
  );
});

const renderHistory = async (entries: readonly EvalCellHistoryEntry[]) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: Number.POSITIVE_INFINITY } },
  });
  queryClient.setQueryData(evalQueries.history("case-agent").queryKey, entries);
  const root = createRootRoute({
    component: () => <CellHistory cellKey="case-agent" runId="run_current" />,
  });
  const cell = createRoute({
    getParentRoute: () => root,
    path: "/evals/$runId/cells/$cellKey",
  });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/"] }),
    routeTree: root.addChildren([cell]),
  });
  await router.load();
  const html = renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  queryClient.clear();
  return html;
};

test("shows dates, results and current selection with links to each run", async () => {
  const current = historyEntry(3, 3);
  const html = await renderHistory([
    current,
    {
      ...historyEntry(1, 3),
      runId: "run_previous",
      internalId: "cell_previous",
    },
  ]);
  expect(html).toContain(clock(Date.UTC(2026, 8, 6, 12, 56)));
  expect(html).toContain("3/3 passed");
  expect(html).toContain("1/3 passed");
  expect(html).toContain('aria-current="page"');
  expect(html).toContain("Current");
  expect(html).toContain("/evals/run_previous/cells/case-agent");
  expect(html.indexOf("run_current")).toBeLessThan(
    html.indexOf("run_previous")
  );
  expect(html).not.toContain("Steady");
  expect(html).not.toContain("ring-offset");
});

test("keeps the list to the five most recent runs", async () => {
  const html = await renderHistory(
    Array.from({ length: 6 }, (_, index) => ({
      ...historyEntry(1, 1),
      runId: `run_${index}`,
      internalId: `cell_${index}`,
    }))
  );
  expect(html).toContain("/evals/run_4/cells/case-agent");
  expect(html).not.toContain("/evals/run_5/cells/case-agent");
});

test("does not repeat the result when there are no other runs", async () => {
  expect(await renderHistory([])).toContain("No previous runs.");
  const html = await renderHistory([historyEntry(1, 1)]);
  expect(html).toContain("No previous runs.");
  expect(html).not.toContain("<a ");
});
