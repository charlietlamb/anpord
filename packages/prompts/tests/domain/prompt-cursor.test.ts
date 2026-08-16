import { describe, expect, test } from "bun:test";
import { PromptId, PromptName } from "@anpord/schema/domain/prompts";
import { Effect, Exit } from "effect";
import {
  decodePromptCursor,
  encodePromptCursor,
  type PromptCursorPayload,
} from "../../src/domain/prompt-cursor";

const updatedCursor = {
  id: PromptId.make("greeting"),
  sort: "updated",
  updatedAt: Date.UTC(2026, 0, 1),
} satisfies PromptCursorPayload;

const nameCursor = {
  id: PromptId.make("greeting"),
  name: PromptName.make("Alpha"),
  sort: "name",
} satisfies PromptCursorPayload;

const decode = (encoded: string, sort: "name" | "updated" = "updated") =>
  Effect.runSyncExit(decodePromptCursor(encoded, sort));

const forge = (payload: unknown) =>
  btoa(JSON.stringify(payload))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

describe("prompt cursor", () => {
  test("round trips an updated cursor", () => {
    expect(decode(encodePromptCursor(updatedCursor))).toEqual(
      Exit.succeed(updatedCursor)
    );
  });

  test("round trips a name cursor", () => {
    expect(decode(encodePromptCursor(nameCursor), "name")).toEqual(
      Exit.succeed(nameCursor)
    );
  });

  test("encodes to a url safe string", () => {
    const encoded = encodePromptCursor({
      id: PromptId.make("a/b_c-d"),
      sort: "updated",
      updatedAt: Date.UTC(2026, 5, 30, 12, 34, 56, 789),
    });

    expect(encoded).toBe(encodeURIComponent(encoded));
    expect(encoded).not.toContain("=");
  });

  test("rejects a cursor issued under the other sort", () => {
    const exit = decode(encodePromptCursor(updatedCursor), "name");

    expect(Exit.isFailure(exit)).toBe(true);
    expect(String(exit)).toContain("InvalidCursor");
  });

  test("rejects a name cursor used against the updated sort", () => {
    expect(
      Exit.isFailure(decode(encodePromptCursor(nameCursor), "updated"))
    ).toBe(true);
  });

  test("fails rather than throwing on a cursor that is not base64", () => {
    const exit = decode("not a cursor!!");

    expect(Exit.isFailure(exit)).toBe(true);
    expect(String(exit)).toContain("InvalidCursor");
  });

  test("fails on a tampered payload rather than trusting it", () => {
    expect(
      Exit.isFailure(
        decode(forge({ id: "", sort: "updated", updatedAt: "soon" }))
      )
    ).toBe(true);
  });

  test("rejects an id that no prompt could ever have", () => {
    expect(
      Exit.isFailure(
        decode(forge({ id: "NOT AN ID", sort: "updated", updatedAt: 0 }))
      )
    ).toBe(true);
  });

  test("rejects a name cursor missing its sort key", () => {
    expect(
      Exit.isFailure(decode(forge({ id: "ok", sort: "name" }), "name"))
    ).toBe(true);
  });

  test("fails on an empty cursor rather than dying", () => {
    const exit = decode("");

    expect(Exit.isFailure(exit)).toBe(true);
    expect(exit.toString()).not.toContain("Die");
  });
});
