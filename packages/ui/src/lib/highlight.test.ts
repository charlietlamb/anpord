import { describe, expect, it } from "bun:test";
import { shellTokens } from "./highlight";

const kinds = async (command: string) =>
  (await shellTokens(command))
    .filter((token) => token.value.trim() !== "")
    .map((token) => [token.kind, token.value] as const);

/* The grammar does the parsing; what is worth asserting is that its scopes
   land on the theme's own scale rather than on Shiki's palette. */
describe("separating a command", () => {
  it("keeps a flag apart from the command it belongs to", async () => {
    expect(await kinds("head -100")).toEqual([
      ["text", "head"],
      ["flag", "-100"],
    ]);
  });

  it("reads a redirect and a pipe as operators", async () => {
    const found = await kinds("find / 2>/dev/null | head");

    expect(found).toContainEqual(["operator", "2>"]);
    expect(found).toContainEqual(["operator", "|"]);
  });

  it("keeps a quoted argument whole", async () => {
    expect(await kinds("find -iname '*atmn*'")).toContainEqual([
      "string",
      "'*atmn*'",
    ]);
  });

  it("recognises a trailing comment", async () => {
    expect(await kinds("npm install # note")).toContainEqual([
      "comment",
      "# note",
    ]);
  });

  /* Concatenating the values returns the input, so nothing is dropped between
     the grammar and the row. */
  it("loses nothing it was given", async () => {
    const command = "for f in a b; do cat $f; done";
    const tokens = await shellTokens(command);

    expect(tokens.map(({ value }) => value).join("")).toBe(command);
  });
});
