import { describe, expect, it } from "bun:test";
import { callSubjectOf, commandText } from "../../src/domain/eval-journal";

describe("what a tool call acted on", () => {
  it("reads the named field a harness sends", () => {
    expect(
      callSubjectOf(JSON.stringify({ skill: "autumn:autumn-setup" }))
    ).toBe("autumn:autumn-setup");
    expect(
      callSubjectOf(JSON.stringify({ file_path: "src/app.ts", limit: 20 }))
    ).toBe("src/app.ts");
  });

  it("falls back to the first text it carries", () => {
    expect(callSubjectOf(JSON.stringify({ id: 3, plan: "pro" }))).toBe("pro");
  });

  it("reads plain text as itself", () => {
    expect(callSubjectOf("ls -la")).toBe("ls -la");
    expect(callSubjectOf(JSON.stringify("pro_plan"))).toBe("pro_plan");
  });

  it("has nothing to say for empty or structural input", () => {
    expect(callSubjectOf(undefined)).toBeNull();
    expect(callSubjectOf("")).toBeNull();
    expect(callSubjectOf("null")).toBeNull();
    expect(callSubjectOf(JSON.stringify([1, 2]))).toBeNull();
    expect(callSubjectOf(JSON.stringify({ limit: 20 }))).toBeNull();
  });
});

describe("the command a harness ran", () => {
  it("reads the script out of a quoted shell invocation", () => {
    expect(
      commandText(
        `/bin/bash -lc "env | rg '"'^AUTUMN_'"' | sed -E 's/=.*"'$/=<set>/'"' || true; npx atmn env --prod"`
      )
    ).toBe(
      "env | rg '^AUTUMN_' | sed -E 's/=.*$/=<set>/' || true; npx atmn env --prod"
    );
  });

  it("unescapes what double quotes escape", () => {
    expect(commandText(`/bin/zsh -lc "printf '%s\\\\n' \\"done\\""`)).toBe(
      `printf '%s\\n' "done"`
    );
  });

  it("reads a single-quoted script", () => {
    expect(commandText(`/bin/sh -c 'npx atmn push --yes'`)).toBe(
      "npx atmn push --yes"
    );
  });

  it("leaves a bare command alone", () => {
    expect(commandText("npx atmn push")).toBe("npx atmn push");
  });
});
