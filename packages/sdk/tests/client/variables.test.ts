import { describe, expect, test } from "bun:test";
import type { VariablesFor } from "../../src/client/variables";

declare module "../../src/client/variables" {
  interface AnpordPromptVariables {
    readonly "no-variables": Record<string, never>;
    readonly "support-reply": { readonly product: string };
  }
}

/** Compiles only when the two types are the same, so a change in what the
 * generated declarations mean fails the build rather than the reader. */
const sameType = <Expected, Actual>(
  ..._proof: [Expected] extends [Actual]
    ? [Actual] extends [Expected]
      ? []
      : [never]
    : [never]
) => true;

describe("a prompt the declarations name", () => {
  test("is held to the variables it declares", () => {
    expect(
      sameType<
        VariablesFor<"support-reply", { product: string }>,
        { readonly product: string }
      >()
    ).toBe(true);
  });
});

describe("a prompt the declarations do not name", () => {
  /** Generating is optional and a prompt can be created after the last run,
   * so an unknown id takes whatever the caller has. */
  test("takes any variables", () => {
    expect(
      sameType<
        VariablesFor<"never-generated", { anything: string }>,
        Readonly<Record<string, string | number | boolean | null | undefined>>
      >()
    ).toBe(true);
  });
});

describe("a prompt declared as using none", () => {
  /** Somebody adding a variable in the dashboard must not break a build that
   * never touched the prompt, so declaring none reads as not knowing. */
  test("takes any variables rather than refusing them", () => {
    expect(
      sameType<
        VariablesFor<"no-variables", { added_later: string }>,
        Readonly<Record<string, string | number | boolean | null | undefined>>
      >()
    ).toBe(true);
  });
});

describe("an id built at runtime", () => {
  test("takes any variables, since it cannot be looked up", () => {
    expect(
      sameType<
        VariablesFor<string, { anything: string }>,
        Readonly<Record<string, string | number | boolean | null | undefined>>
      >()
    ).toBe(true);
  });
});
