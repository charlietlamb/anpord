import { expect, test } from "bun:test";
import { fromWire } from "./wire";

test("an ISO timestamp becomes the shape the UI reads", () => {
  const run = fromWire<{
    readonly startedAt: { readonly epochMillis: number };
    readonly name: string;
  }>({ name: "planner-core", startedAt: "2026-09-06T12:00:00.000Z" });

  expect(run.startedAt.epochMillis).toBe(
    Date.parse("2026-09-06T12:00:00.000Z")
  );
  expect(run.name).toBe("planner-core");
});

test("nulls and nested collections survive the walk", () => {
  const page = fromWire<{
    readonly runs: readonly {
      readonly finishedAt: null;
      readonly cells: readonly {
        readonly at: { readonly epochMillis: number };
      }[];
    }[];
    readonly total: number;
  }>({
    runs: [{ cells: [{ at: "2026-01-02T03:04:05Z" }], finishedAt: null }],
    total: 7,
  });

  expect(page.runs[0]?.finishedAt).toBeNull();
  expect(page.runs[0]?.cells[0]?.at.epochMillis).toBe(
    Date.parse("2026-01-02T03:04:05Z")
  );
  expect(page.total).toBe(7);
});

/* An id or a plain date would become an object the UI then renders as
   [object Object], so the pattern has to require a time. */
test("an ordinary string is not mistaken for a timestamp", () => {
  const value = fromWire<Record<string, string>>({
    cellKey: "9c4f0d41f90158e6",
    id: "run_123",
    when: "2026-09-06",
  });

  expect(value.id).toBe("run_123");
  expect(value.when).toBe("2026-09-06");
  expect(value.cellKey).toBe("9c4f0d41f90158e6");
});

test("a 204 carries no payload", () => {
  expect(fromWire<undefined>(undefined)).toBeUndefined();
});
