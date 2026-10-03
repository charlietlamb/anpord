import { describe, expect, it } from "bun:test";
import { parseEnvFile } from "../../src/cli/env-file";

describe("reading a .env file", () => {
  it("keeps a quoted value whole and drops the comment after it", () => {
    expect(
      parseEnvFile(`A="has # inside" # note\nB='x' # y\nC=plain # z`)
    ).toEqual([
      { name: "A", value: "has # inside" },
      { name: "B", value: "x" },
      { name: "C", value: "plain" },
    ]);
  });

  it("takes the last value of a repeated name", () => {
    expect(parseEnvFile("export A=1\n# A=commented\nA=2\nEMPTY=\n")).toEqual([
      { name: "A", value: "2" },
    ]);
  });
});
