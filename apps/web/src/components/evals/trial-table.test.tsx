import { expect, test } from "bun:test";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { renderToStaticMarkup } from "react-dom/server";
import { TRIALS } from "@/components/dev/eval-fixtures";
import { TrialTable } from "./trial-table";

const renderTrials = async (runId: string, count: number) => {
  const root = createRootRoute({
    component: () => (
      <TrialTable
        cellKey="case-agent"
        runId={runId}
        trials={TRIALS.slice(0, count)}
      />
    ),
  });
  const trial = createRoute({
    getParentRoute: () => root,
    path: "/evals/$runId/cells/$cellKey/trials/$ordinal",
  });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/"] }),
    routeTree: root.addChildren([trial]),
  });
  await router.load();
  return renderToStaticMarkup(<RouterProvider router={router} />);
};

test("links every trial to its selected run", async () => {
  const html = await renderTrials("run_current", 2);
  expect(html).toContain("/evals/run_current/cells/case-agent/trials/1");
  expect(html).toContain("/evals/run_current/cells/case-agent/trials/2");
  expect(html).not.toContain("/trials/3");
});

test("switching runs replaces the trial list", async () => {
  await renderTrials("run_previous", 3);
  const html = await renderTrials("run_current", 1);
  expect(html).toContain("/evals/run_current/cells/case-agent/trials/1");
  expect(html).not.toContain("run_previous");
  expect(html).not.toContain("/trials/2");
});

test("an empty run does not display historical trials", async () => {
  await renderTrials("run_previous", 3);
  const html = await renderTrials("run_current", 0);
  expect(html).toContain("No trials recorded for this case in this run.");
  expect(html).not.toContain("/trials/");
});
