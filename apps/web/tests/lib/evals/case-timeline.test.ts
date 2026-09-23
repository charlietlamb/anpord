import { describe, expect, test } from "bun:test";
import type {
  EvalCaseVersion,
  EvalCellHistoryEntry,
} from "@anpord/schema/domain/evals";
import { DateTime } from "effect";
import { timelineOf } from "../../../src/lib/evals/case-timeline";

const reading = (id: string, definitionHash: string) =>
  ({ definitionHash, internalId: id }) as unknown as EvalCellHistoryEntry;

const version = (definitionHash: string, at: number): EvalCaseVersion => ({
  author: "Charlie",
  changes: [],
  createdAt: DateTime.unsafeMake(at),
  definitionHash,
});

const shape = (items: ReturnType<typeof timelineOf>) =>
  items.map((item) =>
    item.kind === "reading"
      ? item.entry.internalId
      : `${item.created ? "created" : "edited"}:${item.version.definitionHash}`
  );

describe("a case's timeline", () => {
  test("marks where each version began, newest first", () => {
    const versions = [version("v1", 1), version("v2", 2)];
    const entries = [
      reading("c", "v2"),
      reading("b", "v1"),
      reading("a", "v1"),
    ];

    expect(shape(timelineOf(entries, versions))).toEqual([
      "c",
      "edited:v2",
      "b",
      "a",
      "created:v1",
    ]);
  });

  test("says nothing about a version it has no record of", () => {
    expect(shape(timelineOf([reading("a", "gone")], []))).toEqual(["a"]);
  });
});
