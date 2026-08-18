import { describe, expect, test } from "bun:test";
import { declarationFile } from "../../src/cli/declarations";

describe("the generated declarations", () => {
  /** Without the import the block shadows the module rather than adding to
   * it, and every import of the SDK stops resolving. */
  test("import the module before augmenting it", () => {
    const file = declarationFile([["a", ["x"]]]);

    expect(file.indexOf('import "anpord";')).toBeLessThan(
      file.indexOf("declare module")
    );
  });

  test("name each variable a prompt uses", () => {
    expect(declarationFile([["support-reply", ["product"]]])).toContain(
      '"support-reply": { "product": string };'
    );
  });

  /** A prompt with no variables must still refuse one, rather than falling
   * back to accepting anything. */
  test("leave a prompt without variables unable to take any", () => {
    expect(declarationFile([["greeting", []]])).toContain(
      '"greeting": Record<string, never>;'
    );
  });

  test("quote an id that is not an identifier", () => {
    expect(declarationFile([["odd-id.v2", ["a"]]])).toContain('"odd-id.v2":');
  });

  /** Sorted so regenerating without changing a prompt leaves no diff. */
  test("order prompts by id", () => {
    const file = declarationFile([
      ["zulu", []],
      ["alpha", []],
    ]);

    expect(file.indexOf('"alpha"')).toBeLessThan(file.indexOf('"zulu"'));
  });
});
