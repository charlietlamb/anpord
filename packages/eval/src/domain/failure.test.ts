import { describe, expect, it } from "bun:test";
import { Cause } from "effect";
import { SandboxUnavailable } from "./errors";
import { failureOf } from "./failure";

describe("failureOf", () => {
  /** The case that prompted this: a provider limit stored as a thousand
   * characters of stack, rendered under every failed row in the list. */
  it("reads the reason a tagged error already carries", () => {
    const failure = failureOf(
      Cause.fail(
        new SandboxUnavailable({
          provider: "daytona",
          reason: "Total disk limit exceeded. Maximum allowed: 30GiB.",
        })
      )
    );

    expect(failure).toBe("Total disk limit exceeded. Maximum allowed: 30GiB.");
  });

  /** The provider writes several lines; a row is one line high. */
  it("keeps the first line of a reason that runs on", () => {
    const failure = failureOf(
      Cause.fail(
        new SandboxUnavailable({
          provider: "daytona",
          reason: "Total disk limit exceeded.\nConsider archiving sandboxes.",
        })
      )
    );

    expect(failure).toBe("Total disk limit exceeded.");
  });

  it("truncates a reason too long for a row", () => {
    const failure = failureOf(
      Cause.fail(
        new SandboxUnavailable({ provider: "daytona", reason: "x".repeat(400) })
      )
    );

    expect(failure.length).toBeLessThanOrEqual(241);
    expect(failure.endsWith("…")).toBe(true);
  });

  /** A defect has no reason to read, so the first line of the rendered cause
   * is the best available, and still one line rather than a stack. */
  it("falls back to one line for a failure carrying no reason", () => {
    const failure = failureOf(Cause.die(new Error("socket hang up")));

    expect(failure).toContain("socket hang up");
    expect(failure).not.toContain("\n");
  });

  /* The defect this exists to catch: a trial recorded Cause.pretty straight
     into its row, so the two kilobytes of stack around a one-line problem --
     absolute paths, frames, and whatever an error dragged with it -- became
     the column a person reads. */
  it("records no stack for a cause that carries one", () => {
    const deep = new Error("connect ECONNREFUSED 10.0.0.1:443");
    deep.stack = [
      "Error: connect ECONNREFUSED 10.0.0.1:443",
      "    at TCPConnectWrap.afterConnect (node:net:1611:16)",
      "    at /Users/someone/anpord/packages/eval/src/adapters/sandbox.ts:24:9",
    ].join("\n");

    const failure = failureOf(Cause.die(deep));

    expect(failure).toContain("ECONNREFUSED");
    expect(failure).not.toContain("\n");
    expect(failure).not.toContain("at TCPConnectWrap");
    expect(failure).not.toContain("/Users/");
    expect(failure.length).toBeLessThanOrEqual(241);
  });
});
