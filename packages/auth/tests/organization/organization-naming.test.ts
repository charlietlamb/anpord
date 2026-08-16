import { describe, expect, test } from "bun:test";
import {
  displayName,
  slugify,
} from "../../src/organization/organization-naming";

describe("displayName", () => {
  test("prefers the name a person gave", () => {
    expect(displayName("Charlie Lamb", "c@example.com")).toBe("Charlie Lamb");
  });

  test("falls back to the local part when no name is set", () => {
    expect(displayName(null, "charlie@example.com")).toBe("charlie");
  });

  test("treats blank as absent, so an org is never named a space", () => {
    expect(displayName("   ", "charlie@example.com")).toBe("charlie");
  });

  test("survives an email with no local part", () => {
    expect(displayName(null, "@example.com")).toBe("Workspace");
  });
});

describe("slugify", () => {
  test("lowercases and joins words with a single hyphen", () => {
    expect(slugify("Charlie Lamb")).toBe("charlie-lamb");
  });

  test("collapses runs of punctuation rather than repeating hyphens", () => {
    expect(slugify("a  --  b")).toBe("a-b");
  });

  test("never leads or trails with a hyphen", () => {
    expect(slugify("  hello  ")).toBe("hello");
    expect(slugify("!!!hello!!!")).toBe("hello");
  });

  test("bounds length, because the column is not unbounded", () => {
    expect(slugify("a".repeat(80))).toHaveLength(32);
  });

  test("gives a usable slug when a name has nothing sluggable", () => {
    expect(slugify("!!!")).toBe("workspace");
    expect(slugify("")).toBe("workspace");
  });
});
