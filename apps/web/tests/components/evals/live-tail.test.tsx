import { expect, mock, test } from "bun:test";
import { prerender } from "react-dom/static";

mock.module("../../../src/components/evals/run-tail-listener", () => {
  throw new Error("chunk failed");
});

const { LiveTail } = await import("../../../src/components/evals/live-tail");

test("renders nothing when the live tail cannot load", async () => {
  const { prelude } = await prerender(
    <LiveTail batchId="bat_1" runId="run_1" />
  );
  expect(await new Response(prelude).text()).toBe("<!--$--><!--/$-->");
});
