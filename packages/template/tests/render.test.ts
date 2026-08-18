import { describe, expect, test } from "bun:test";
import { MissingVariables } from "../src/errors";
import { extractVariables } from "../src/extract";
import { render } from "../src/render";

describe("substitution", () => {
  test("fills a name", () => {
    expect(render("Hello {{name}}", { name: "Ada" }).content).toBe("Hello Ada");
  });

  test("reads a name written with spaces the same way", () => {
    expect(render("Hello {{ name }}", { name: "Ada" }).content).toBe(
      "Hello Ada"
    );
  });

  test("fills every occurrence of one name", () => {
    expect(render("{{a}} and {{a}}", { a: "x" }).content).toBe("x and x");
  });

  test("leaves prose without variables exactly as it was", () => {
    const prose = "You are a helpful assistant. Be brief.";
    expect(render(prose, {}).content).toBe(prose);
  });
});

describe("a name with no value", () => {
  test("throws, naming every one that is missing", () => {
    let thrown: unknown;
    try {
      render("{{a}} {{b}} {{a}}", {});
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(MissingVariables);
    expect((thrown as MissingVariables).missing).toEqual(["a", "b"]);
  });

  test("keeps the braces when asked to", () => {
    const rendered = render("Hi {{name}}", {}, { onMissing: "keep" });

    expect(rendered.content).toBe("Hi {{name}}");
    expect(rendered.missing).toEqual(["name"]);
  });

  test("removes the braces when asked to", () => {
    const rendered = render("Hi {{name}}!", {}, { onMissing: "empty" });

    expect(rendered.content).toBe("Hi !");
    expect(rendered.missing).toEqual(["name"]);
  });

  /** `{ name: user.name }` produces undefined when the field is absent, so a
   * caller should not have to write `?? ""` at every call site. */
  test("reads null and undefined as absent rather than as words", () => {
    expect(render("{{a}}", { a: null }, { onMissing: "keep" }).content).toBe(
      "{{a}}"
    );
    expect(
      render("{{a}}", { a: undefined }, { onMissing: "keep" }).content
    ).toBe("{{a}}");
  });
});

describe("a value the template does not use", () => {
  /** One context object rendered against several prompts is the normal shape
   * of correct code, and an author dropping a name should not crash a caller
   * that still passes it. */
  test("is ignored rather than refused", () => {
    expect(render("Hello {{a}}", { a: "x", unused: "y" }).content).toBe(
      "Hello x"
    );
  });
});

describe("values that are not strings", () => {
  test("writes zero rather than nothing", () => {
    expect(render("{{n}}", { n: 0 }).content).toBe("0");
  });

  test("writes false rather than nothing", () => {
    expect(render("{{b}}", { b: false }).content).toBe("false");
  });

  test("treats an empty string as supplied", () => {
    const rendered = render("[{{a}}]", { a: "" });

    expect(rendered.content).toBe("[]");
    expect(rendered.missing).toEqual([]);
  });
});

describe("escaping", () => {
  test("doubling the braces emits them literally", () => {
    expect(render("{{{{name}}}}", {}).content).toBe("{{name}}");
  });

  test("an escape sits beside a real variable", () => {
    expect(render("{{{{raw}}}} and {{a}}", { a: "x" }).content).toBe(
      "{{raw}} and x"
    );
  });

  /** A value is data. Reading it back as template would let a caller-supplied
   * name smuggle in syntax. */
  test("does not read a supplied value as template", () => {
    expect(render("{{a}}", { a: "{{b}}" }).content).toBe("{{b}}");
  });
});

describe("dotted names", () => {
  test("reads the flat key", () => {
    expect(render("{{user.name}}", { "user.name": "Ada" }).content).toBe("Ada");
  });

  test("does not walk into a nested object", () => {
    expect(() => render("{{user.name}}", { user: "Ada" } as never)).toThrow(
      MissingVariables
    );
  });
});

describe("braces that are not a variable", () => {
  test("are left alone", () => {
    for (const odd of ["{{ }}", "{{a b}}", "a { b }", "{{unclosed"]) {
      expect(render(odd, {}).content).toBe(odd);
    }
  });
});

describe("regular expression state", () => {
  /** A shared global matcher carries lastIndex between calls and would skip
   * matches on the second pass. */
  test("renders the same template twice the same way", () => {
    const template = "{{a}} {{b}}";
    const values = { a: "1", b: "2" };

    expect(render(template, values).content).toBe(
      render(template, values).content
    );
  });

  test("extracting then rendering agree on the same string", () => {
    const template = "{{a}} {{b}} {{a}}";

    expect(extractVariables(template)).toEqual(["a", "b"]);
    expect(render(template, { a: "1", b: "2" }).content).toBe("1 2 1");
  });
});
