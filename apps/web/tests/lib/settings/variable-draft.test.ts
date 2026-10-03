import { describe, expect, it } from "bun:test";
import {
  completeRows,
  type DraftRow,
  pasteInto,
  rowProblem,
} from "../../../src/lib/settings/variable-draft";

const row = (name: string, value = "v"): DraftRow => ({
  id: name,
  name,
  value,
});

describe("variable draft", () => {
  it("flags reserved, malformed and repeated names", () => {
    const rows = [row("SPHYNX_TOKEN"), row("lower"), row("A"), row("A")];

    expect(rowProblem(rows, 0, [], "organization")?.message).toContain(
      "reserved"
    );
    expect(rowProblem(rows, 1, [], "organization")?.message).toBe(
      "Use capital letters, digits and underscores"
    );
    expect(rowProblem(rows, 2, [], "organization")).toBeNull();
    expect(rowProblem(rows, 3, [], "organization")?.message).toBe(
      "This name is already in the list"
    );
  });

  it("warns when a name replaces one at the same scope", () => {
    const existing = [
      { name: "A", preview: "sk-…1234", scope: "organization" },
    ];

    expect(rowProblem([row("A")], 0, existing, "organization")).toEqual({
      field: "value",
      message: "Replaces sk-…1234 on save",
      tone: "warning",
    });
    expect(rowProblem([row("A")], 0, existing, "personal")).toBeNull();
  });

  it("pastes entries in place and keeps one empty row last", () => {
    const rows = pasteInto([row("", "")], 0, [
      { name: "A", value: "1" },
      { name: "B", value: "2" },
    ]);

    expect(rows.map(({ name, value }) => ({ name, value }))).toEqual([
      { name: "A", value: "1" },
      { name: "B", value: "2" },
      { name: "", value: "" },
    ]);
  });

  it("submits only rows with a name and a value", () => {
    expect(completeRows([row("A"), row("B", ""), row("", "x")])).toEqual([
      { name: "A", value: "v" },
    ]);
  });
});
