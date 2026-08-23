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
});
