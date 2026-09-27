import { expect, test } from "bun:test";
import {
  notifyManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { Window } from "happy-dom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { type CrumbQuery, useBreadcrumbs } from "@/lib/use-breadcrumbs";

notifyManager.setScheduler((callback) => callback());

const view = new Window({ url: "http://localhost/" });
Object.assign(globalThis, {
  document: view.document,
  IS_REACT_ACT_ENVIRONMENT: true,
  navigator: view.navigator,
  scrollTo: () => undefined,
  window: view,
});

function Crumbs() {
  return (
    <p>
      {useBreadcrumbs()
        .map((crumb) => crumb.label)
        .join(" / ")}
    </p>
  );
}

const mount = async (crumb: (params: Record<string, string>) => CrumbQuery) => {
  const queryClient = new QueryClient();
  const root = createRootRoute({ component: Crumbs });
  const caseRoute = createRoute({
    getParentRoute: () => root,
    path: "/cases/$caseId",
    staticData: { crumb, title: "Case" },
  });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/cases/c1"] }),
    routeTree: root.addChildren([caseRoute]),
  });
  const container = view.document.createElement("div");
  view.document.body.appendChild(container);

  await act(async () => {
    createRoot(container as never).render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    );
    await router.load();
  });

  return { container, queryClient };
};

test("a crumb shows its query's data once the query settles, with nothing else rendering", async () => {
  const { container, queryClient } = await mount((params) => ({
    queryKey: ["case", params.caseId],
    label: (name) => name as string,
  }));
  expect(container.textContent).toBe("Case");

  act(() => {
    queryClient.setQueryData(["case", "c1"], "parser-refactor");
  });
  expect(container.textContent).toBe("parser-refactor");
});

test("a crumb does not read again when a query it does not use changes", async () => {
  const reads: unknown[] = [];
  const { container, queryClient } = await mount((params) => ({
    queryKey: ["case", params.caseId],
    label: (name) => {
      reads.push(name);
      return name as string;
    },
  }));
  act(() => {
    queryClient.setQueryData(["case", "c1"], "parser-refactor");
  });
  const settled = reads.length;

  act(() => {
    queryClient.setQueryData(["tail", "t1"], 1);
    queryClient.setQueryData(["tail", "t1"], 2);
    queryClient.setQueryData(["realtime"], "renewed");
  });
  expect(reads.length).toBe(settled);
  expect(container.textContent).toBe("parser-refactor");
});
