import { expect, test } from "bun:test";
import { API_REPORTED_LIMITS } from "@anpord/schema/domain/api-mocks";
import { apiCapture } from "../../src/mock-api/capture";

test("reports a body past the stored limit whole, so the host can redact it before cutting", () => {
  const body = "x".repeat(20_000);

  expect(apiCapture()(body)).toEqual({
    format: "json",
    state: "captured",
    text: JSON.stringify(body),
    truncated: false,
  });
});

test("a runaway body stops at the protocol ceiling", () => {
  const captured = apiCapture()("x".repeat(1_000_000));

  expect([captured.text.length, captured.truncated]).toEqual([
    API_REPORTED_LIMITS.text,
    true,
  ]);
});
