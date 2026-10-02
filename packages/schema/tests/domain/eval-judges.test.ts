import { describe, expect, it } from "bun:test";
import { Either, Schema } from "effect";
import { EvalJudge } from "../../src/domain/eval-judges";

const decode = (files: unknown) =>
  Schema.decodeUnknownEither(EvalJudge)({
    kind: "judge",
    name: "post quality",
    harness: "codex",
    model: "judge-model",
    prompt: "The post is clear",
    choices: { clear: 1, unclear: 0 },
    files,
  });

const filesOf = (files: unknown) =>
  Either.match(decode(files), {
    onLeft: () => "rejected",
    onRight: (judge) => judge.files,
  });

describe("judge files", () => {
  it("accepts workspace relative paths", () => {
    expect(filesOf(["out/post.md", "notes.txt"])).toEqual([
      "out/post.md",
      "notes.txt",
    ]);
  });

  it.each([
    ["/etc/passwd"],
    ["../secrets.md"],
    ["out/../../post.md"],
    ["~/post.md"],
    ["C:/post.md"],
    ["out\\post.md"],
    [""],
  ])("rejects %s", (path) => {
    expect(filesOf([path])).toBe("rejected");
  });

  it("reads at most eight files", () => {
    const paths = Array.from({ length: 9 }, (_, index) => `out/${index}.md`);
    expect(filesOf(paths.slice(0, 8))).toEqual(paths.slice(0, 8));
    expect(filesOf(paths)).toBe("rejected");
    expect(filesOf([])).toBe("rejected");
  });
});
