import { expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { CellHistory } from "./cell-history";

const failed = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  client.setQueryDefaults(["evals", "history"], { queryFn: () => [] });
  return client;
};

test("stays a placeholder while the page around it is still a skeleton", () => {
  const html = renderToStaticMarkup(
    <QueryClientProvider client={failed()}>
      <CellHistory cellKey="cell_test" quiet runId="run_test" />
    </QueryClientProvider>
  );
  expect(html).not.toContain("Could not load recent runs");
  expect(html).not.toContain("No previous runs");
});
