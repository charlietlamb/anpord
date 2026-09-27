import { expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import { useBreadcrumbs } from "@/lib/use-breadcrumbs";

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

test("a crumb shows its query's data once the query settles, with nothing else rendering", async () => {
  const queryClient = new QueryClient();
  const root = createRootRoute({ component: Crumbs });
  const caseRoute = createRoute({
    getParentRoute: () => root,
    path: "/cases/$caseId",
    staticData: {
      crumb: (params, client) =>
        client.getQueryData<string>(["case", params.caseId]),
      title: "Case",
    },
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
  expect(container.textContent).toBe("Case");

  act(() => {
    queryClient.setQueryData(["case", "c1"], "parser-refactor");
  });
  expect(container.textContent).toBe("parser-refactor");
});
