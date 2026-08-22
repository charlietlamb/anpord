/**
 * Shell, split into the few kinds worth colouring.
 *
 * Hand-rolled rather than a grammar engine: every command here is `/bin/sh`,
 * and the alternative ships a WASM regex engine and a grammar file into a
 * hover card. Four token kinds carry a command's shape - where the strings
 * end, where one stage pipes into the next - and that is what a reader is
 * scanning for.
 *
 * Deliberately not a parser. It does not track nesting or expansion, so a
 * `$(...)` reads as an operator and a plain word. Wrong highlighting is
 * cosmetic here; a parser that throws on the shell an agent invented is not.
 */
export type ShellTokenKind =
  | "comment"
  | "flag"
  | "operator"
  | "string"
  | "text";

export interface ShellToken {
  readonly kind: ShellTokenKind;
  readonly value: string;
}

/* Ordered: a flag inside a string is part of the string, so strings match
   first and the scanner never re-examines what they consumed. */
const PATTERNS: readonly (readonly [ShellTokenKind, RegExp])[] = [
  ["comment", /^#[^\n]*/],
  ["string", /^'(?:[^'\\]|\\.)*'?/],
  ["string", /^"(?:[^"\\]|\\.)*"?/],
  ["operator", /^(?:\|\||&&|[|&;()<>]|\$\(|\d*>>?)/],
  ["flag", /^--?[A-Za-z][\w-]*/],
];

/** What can precede a flag. A hyphen anywhere else is inside a word, like the
 * one in `github-light.svg`. */
const WORD_BOUNDARY = /[\s|&;()<>]/;

/** Splits a command into runs of one kind, in order, losing nothing: the
 * concatenated values equal the input. */
export const shellTokens = (source: string): readonly ShellToken[] => {
  const tokens: ShellToken[] = [];
  let rest = source;
  let plain = "";
  /* Where the scanner is, so a flag can ask what preceded it. `plain` cannot
     answer: the previous token may have been a string, leaving it empty. */
  let index = 0;

  const flush = () => {
    if (plain !== "") {
      tokens.push({ kind: "text", value: plain });
      plain = "";
    }
  };

  while (rest !== "") {
    const found = PATTERNS.reduce<ShellToken | null>(
      (match, [kind, pattern]) => {
        if (match !== null) {
          return match;
        }

        const hit = pattern.exec(rest);

        if (hit === null) {
          return null;
        }

        /* A flag begins a word: a mid-word hyphen belongs to a filename, and
           colouring one paints half a path. */
        if (kind === "flag" && index > 0) {
          const previous = source[index - 1];

          if (previous !== undefined && !WORD_BOUNDARY.test(previous)) {
            return null;
          }
        }

        return { kind, value: hit[0] };
      },
      null
    );

    if (found === null || found.value === "") {
      plain += rest[0];
      rest = rest.slice(1);
      index += 1;
      continue;
    }

    flush();
    tokens.push(found);
    rest = rest.slice(found.value.length);
    index += found.value.length;
  }

  flush();

  return tokens;
};
