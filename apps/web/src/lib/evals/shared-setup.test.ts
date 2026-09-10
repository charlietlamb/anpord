import { describe, expect, it } from "bun:test";
import type { EvalCell, EvalSetup } from "@anpord/schema/domain/evals";
import { sharedSetupOf } from "./shared-setup";

const cellWith = (setup: Partial<EvalSetup> | null): EvalCell =>
  ({
    setup:
      setup === null
        ? null
        : {
            prepareName: null,
            prompt: "",
            repoRef: null,
            repoUrl: null,
            validatorName: null,
            verifyCommand: null,
            workspace: "/tmp/anpord-task",
            ...setup,
          },
  }) as EvalCell;

describe("what every case in a run shares", () => {
  it("keeps a field the cases agree on and drops one they do not", () => {
    const shared = sharedSetupOf([
      cellWith({ repoUrl: "acme/api", verifyCommand: "bun test" }),
      cellWith({ repoUrl: "acme/api", verifyCommand: "bun run check" }),
    ]);

    expect(shared?.repoUrl).toBe("acme/api");
    expect(shared?.verifyCommand).toBeNull();
  });

  it("keeps a prompt every case renders identically", () => {
    const shared = sharedSetupOf([
      cellWith({ prompt: "Fix the build." }),
      cellWith({ prompt: "Fix the build." }),
    ]);

    expect(shared?.prompt).toBe("Fix the build.");
    expect(shared?.promptVaries).toBe(false);
  });

  /* Variables are substituted before the prompt is stored, so the cases share
     everything above the line that carries the task. */
  it("keeps the lines before the cases diverge", () => {
    const shared = sharedSetupOf([
      cellWith({ prompt: "You are on call.\nRead the logs.\n\nTask: fix npm" }),
      cellWith({ prompt: "You are on call.\nRead the logs.\n\nTask: drop S3" }),
    ]);

    expect(shared?.prompt).toBe("You are on call.\nRead the logs.");
    expect(shared?.promptVaries).toBe(true);
  });

  /* A prefix cut mid-word reads worse than none, so it stops at a line the
     cases still agreed on. */
  it("reports no prompt when the cases share only part of a line", () => {
    const shared = sharedSetupOf([
      cellWith({ prompt: "Fix the build" }),
      cellWith({ prompt: "Fix the tests" }),
    ]);

    expect(shared?.prompt).toBeNull();
  });

  it("reads a single case as sharing all of it", () => {
    const shared = sharedSetupOf([cellWith({ prompt: "Only one." })]);

    expect(shared?.prompt).toBe("Only one.");
    expect(shared?.promptVaries).toBe(false);
  });

  it("has nothing to say when no case recorded its setup", () => {
    expect(sharedSetupOf([cellWith(null)])).toBeNull();
  });
});
