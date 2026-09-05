import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import { MAX_START_CASES, MAX_START_TASKS } from "../../src/domain/eval-quota";
import { StartEvalRequest } from "../../src/domain/evals";
import { PublicStartEvalRequest } from "../../src/public/evals-api";

const evalCase = {
  name: "case",
  prepare: null,
  source: { kind: "empty" as const },
  variables: { task: "Fix it" },
  verify: "true",
};

const task = {
  harness: "codex" as const,
  model: "gpt-5.6-sol",
  provider: "upstash" as const,
};

const request = {
  cases: [evalCase],
  prompt: "{{task}}",
  tasks: [task],
  trials: 1,
};

const decode = Schema.decodeUnknownEither(StartEvalRequest);

const messageOf = (value: unknown) => {
  const decoded = decode(value);

  return decoded._tag === "Left" ? decoded.left.message : "";
};

/* Each of these reaches a sandbox as part of one `sh -c` argument, which Linux
   caps at 128 KiB. Unbounded, a long one failed as an opaque E2BIG inside a VM
   that was already billing rather than at the request that asked for it. */
describe("what a start may carry to a sandbox", () => {
  it("refuses a prompt too long to survive being quoted onto a command line", () => {
    const message = messageOf({
      ...request,
      prompt: "a".repeat(100_000),
    });

    expect(message).toContain("prompt");
    expect(message).toContain("sandbox command line");
  });

  it("accepts a prompt of a size any real one is", () => {
    expect(decode({ ...request, prompt: "a".repeat(2000) })._tag).toBe("Right");
  });

  it("refuses an over-long verifier", () => {
    const message = messageOf({
      ...request,
      cases: [{ ...evalCase, verify: "true && ".repeat(20_000) }],
    });

    expect(message).toContain("verifier");
  });

  it("refuses an over-long case name", () => {
    const message = messageOf({
      ...request,
      cases: [{ ...evalCase, name: "n".repeat(1000) }],
    });

    expect(message).toContain("case name");
  });

  it("refuses an over-long variable value, which is substituted into the prompt", () => {
    const message = messageOf({
      ...request,
      cases: [{ ...evalCase, variables: { task: "t".repeat(10_000) } }],
    });

    expect(message).toContain("variable value");
  });

  it("bounds the public intake the same way", () => {
    const decoded = Schema.decodeUnknownEither(PublicStartEvalRequest)({
      cases: [{ name: "case", variables: { task: "go" }, verify: "true" }],
      prompt: "a".repeat(100_000),
      tasks: [task],
      trials: 1,
    });

    expect(decoded._tag).toBe("Left");
  });
});

/* Cells run eight at a time and each cell runs up to ten trials, so the array
   lengths are what decide how many VMs one accepted request wants. Bounded at
   the wire so no single dimension can be large on its own, before the product
   the admission check computes is even reached. */
describe("how large a grid a start may name", () => {
  const many = <A>(item: A, count: number) =>
    Array.from({ length: count }, () => item);

  it("refuses more cases than the wire allows", () => {
    expect(
      decode({ ...request, cases: many(evalCase, MAX_START_CASES + 1) })._tag
    ).toBe("Left");
  });

  it("refuses more tasks than the wire allows", () => {
    expect(
      decode({ ...request, tasks: many(task, MAX_START_TASKS + 1) })._tag
    ).toBe("Left");
  });

  it("still accepts a grid at the boundary", () => {
    expect(
      decode({ ...request, cases: many(evalCase, MAX_START_CASES) })._tag
    ).toBe("Right");
  });
});
