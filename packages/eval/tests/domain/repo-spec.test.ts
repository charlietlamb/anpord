import { describe, expect, test } from "bun:test";
import { cloneUrlOf, formatRepo, parseRepo } from "../../src/domain/repo-spec";

describe("parseRepo", () => {
  test("reads the shorthand a person would say out loud", () => {
    expect(parseRepo("acme/widgets")).toEqual({
      host: "github.com",
      owner: "acme",
      ref: null,
      repo: "widgets",
    });
  });

  test("keeps a ref with the name it belongs to", () => {
    expect(parseRepo("acme/widgets@a1b2c3d")?.ref).toBe("a1b2c3d");
  });

  test("a branch name may contain a slash", () => {
    expect(parseRepo("acme/widgets@release/2.0")?.ref).toBe("release/2.0");
  });

  test("reads https and ssh clone urls", () => {
    for (const url of [
      "https://github.com/acme/widgets.git",
      "https://github.com/acme/widgets",
      "git@github.com:acme/widgets.git",
    ]) {
      expect(parseRepo(url)).toMatchObject({ owner: "acme", repo: "widgets" });
    }
  });

  test("keeps the host, so a url off GitHub is not quietly redirected", () => {
    const parsed = parseRepo("https://gitlab.com/acme/widgets.git");

    expect(parsed?.host).toBe("gitlab.com");
    expect(cloneUrlOf(parsed as never)).toBe(
      "https://gitlab.com/acme/widgets.git"
    );
  });

  test("surrounding space is not part of the name", () => {
    expect(parseRepo("  acme/widgets  ")?.repo).toBe("widgets");
  });

  test.each([
    "acme",
    "",
    "https://github.com/",
    "not a repo at all",
  ])("refuses %p rather than guessing", (spec) => {
    expect(parseRepo(spec)).toBeNull();
  });
});

describe("formatRepo", () => {
  test("round-trips the shorthand it was read from", () => {
    for (const spec of ["acme/widgets", "acme/widgets@main"]) {
      expect(formatRepo(parseRepo(spec) as never)).toBe(spec);
    }
  });

  test("names the host when it is not the default", () => {
    expect(formatRepo(parseRepo("https://gitlab.com/a/b") as never)).toBe(
      "gitlab.com/a/b"
    );
  });
});
