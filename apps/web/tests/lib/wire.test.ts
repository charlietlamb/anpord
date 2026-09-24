import { expect, test } from "bun:test";
import { EvalBatchSummary } from "@anpord/schema/domain/evals";
import {
  PromptPage,
  ResolvedPrompt,
  Timestamp,
} from "@anpord/schema/domain/prompts";
import { relativeTime } from "@anpord/ui/lib/relative-time";
import { DateTime, Schema } from "effect";
import { fromWire } from "../../src/lib/wire";

const timestamp = "2026-09-06T12:00:00.000Z";

test("prompt dates reach the relative-time formatter as native Dates", () => {
  const page = fromWire(PromptPage, {
    items: [
      {
        author: null,
        description: null,
        id: "fixture",
        latestVersion: 1,
        name: "Fixture",
        productionVersion: null,
        updatedAt: timestamp,
      },
    ],
    nextCursor: null,
  });
  const updatedAt = page.items[0]?.updatedAt;
  expect(updatedAt).toBeInstanceOf(Date);
  if (updatedAt === undefined) {
    throw new Error("Missing prompt");
  }
  expect(relativeTime(updatedAt, new Date("2026-09-06T13:00:00Z"))).toBe(
    "1 hour ago"
  );
  expect(relativeTime(updatedAt, new Date("2026-09-16T13:00:00Z"))).toBe(
    "6 Sep 2026"
  );
});

test("eval dates retain their Effect DateTime type", () => {
  const run = fromWire(EvalBatchSummary, {
    cases: 1,
    failure: null,
    finishedAt: null,
    id: "bat_fixture",
    passed: 0,
    runs: 1,
    scored: 0,
    startedAt: timestamp,
    status: "running",
    trigger: null,
    voided: 0,
  });
  expect(DateTime.isDateTime(run.startedAt)).toBe(true);
  expect(run.startedAt.epochMillis).toBe(Date.parse(timestamp));
  expect(run.finishedAt).toBeNull();
  expect(run.trigger).toBeNull();
});

test("ISO-looking source and config values remain untouched", () => {
  const prompt = fromWire(ResolvedPrompt, {
    author: null,
    channel: null,
    commitMessage: null,
    config: { date: timestamp, nested: [timestamp, null] },
    content: timestamp,
    createdAt: timestamp,
    id: "fixture",
    name: "Fixture",
    version: 1,
    versionId: "version_fixture",
  });
  expect(prompt.createdAt).toBeInstanceOf(Date);
  expect(prompt.content).toBe(timestamp);
  expect(prompt.config).toEqual({ date: timestamp, nested: [timestamp, null] });
});

test("invalid timestamps fail during decoding", () => {
  expect(() => fromWire(Timestamp, "not a date")).toThrow();
  expect(() => fromWire(Schema.DateTimeUtc, "not a date")).toThrow();
});

test("a 204 carries no payload", () => {
  expect(fromWire(Schema.Void, undefined)).toBeUndefined();
});
