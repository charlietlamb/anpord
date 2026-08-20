import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { Effect } from "effect";
import { casesFrom, decodeCaseFile } from "../../src/domain/case-file";

/** The real files, fetched from the repositories that ship them rather than
 * invented here. A parser tested only against its own idea of the format is
 * tested against nothing. */
const load = (name: string) =>
  JSON.parse(
    readFileSync(
      new URL(`../fixtures/case-files/${name}.json`, import.meta.url),
      "utf8"
    )
  );

const decode = (value: unknown) =>
  Effect.runSync(decodeCaseFile(value).pipe(Effect.either));

describe("case files from the wild", () => {
  it("reads Kortix suna", () => {
    const decoded = decode(load("kortix"));

    expect(decoded._tag).toBe("Right");

    if (decoded._tag !== "Right") {
      return;
    }

    const cases = casesFrom(decoded.right);

    expect(cases).toHaveLength(4);
    expect(cases[0]?.name).toBe("kortix-social-1");
    expect(cases[0]?.goal).toContain("LinkedIn post");
    expect(cases[0]?.assertions.length).toBeGreaterThan(0);
  });

  it("reads a customer", () => {
    const decoded = decode(load("notra"));

    expect(decoded._tag).toBe("Right");

    if (decoded._tag !== "Right") {
      return;
    }

    const cases = casesFrom(decoded.right);

    expect(cases).toHaveLength(3);
    expect(cases[0]?.goal.length).toBeGreaterThan(0);
  });

  /** A different shape: `cases` rather than `evals`, with its own vocabulary.
   * Only prompt and id are shared, which is why the union requires those and
   * nothing else. */
  it("reads DeerFlow", () => {
    const decoded = decode(load("deerflow"));

    expect(decoded._tag).toBe("Right");

    if (decoded._tag !== "Right") {
      return;
    }

    const cases = casesFrom(decoded.right);

    expect(cases).toHaveLength(6);
    expect(cases[0]?.name).toBe("skill-reviewer-publish-candidate");
  });

  /** The honest gap. None of these formats carries a verifier, so an imported
   * case cannot decide a pass. Synthesising one would manufacture the false
   * confidence the void gate exists to prevent. */
  it("marks every imported case ungated", () => {
    for (const name of ["kortix", "notra", "deerflow"]) {
      const decoded = decode(load(name));

      if (decoded._tag !== "Right") {
        throw new Error(`${name} did not decode`);
      }

      for (const subject of casesFrom(decoded.right)) {
        expect(subject.verify).toBeNull();
        expect(subject.ungated).toBe(true);
      }
    }
  });

  it("refuses a file with no cases at all", () => {
    expect(decode({ skill_name: "x" })._tag).toBe("Left");
  });

  it("refuses an entry with no prompt", () => {
    expect(decode({ evals: [{ id: 1 }], skill_name: "x" })._tag).toBe("Left");
  });
});
