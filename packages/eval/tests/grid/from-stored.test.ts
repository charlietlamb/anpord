import { describe, expect, test } from "bun:test";
import { caseFrom, taskFrom } from "../../src/grid/from-stored";
import type { CellTask } from "../../src/repositories/run-query";

const stored = (overrides: Partial<CellTask> = {}) =>
  ({
    cell: {
      harness: "codex",
      harnessCredentialConnectionId: "conn-harness",
      harnessVersion: "0.144.4",
      model: "gpt-5.6-sol",
      provider: "daytona",
      sandboxCredentialConnectionId: "conn-sandbox",
    },
    identity: "identity",
    name: "adds a test",
    prepareName: "prepareRepoImage",
    prepareSource: "export {}",
    prompt: "{{task}}",
    source: { kind: "empty" },
    validatorName: "validateRepoImage",
    validatorSource: "export {}",
    verifyCommand: null,
    ...overrides,
  }) as unknown as CellTask;

describe("rebuilding a case from what was stored", () => {
  test("carries the bundled prepare and validator, not just their names", () => {
    const subject = caseFrom(stored());

    expect(subject.prepare).toEqual({
      name: "prepareRepoImage",
      source: "export {}",
    });
    expect(subject.validator).toEqual({
      name: "validateRepoImage",
      source: "export {}",
    });
  });

  test("a case stored without a prepare rebuilds without one", () => {
    const subject = caseFrom(
      stored({ prepareName: null, prepareSource: null })
    );

    expect(subject.prepare).toBeNull();
  });

  test("keeps the identity, so a rebuilt case scores against its baseline", () => {
    expect(caseFrom(stored()).identity).toBe("identity");
  });

  test("a task names the connections its credentials came from", () => {
    expect(taskFrom(stored()).credentials).toEqual({
      harnessConnectionId: "conn-harness",
      sandboxConnectionId: "conn-sandbox",
    });
  });
});
