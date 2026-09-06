/* Deliberately not a parser: it tracks no nesting or expansion, because wrong
   highlighting is cosmetic where a parser throwing on invented shell is not. */
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

/* Order matters: strings match first, so a flag inside one stays part of it. */
const PATTERNS: readonly (readonly [ShellTokenKind, RegExp])[] = [
  ["comment", /^#[^\n]*/],
  ["string", /^'(?:[^'\\]|\\.)*'?/],
  ["string", /^"(?:[^"\\]|\\.)*"?/],
  ["operator", /^(?:\|\||&&|[|&;()<>]|\$\(|\d*>>?)/],
  ["flag", /^--?[A-Za-z][\w-]*/],
];

/** A hyphen elsewhere is inside a word, like the one in `github-light.svg`. */
const WORD_BOUNDARY = /[\s|&;()<>]/;

/** Concatenated values equal the input. The scan position is tracked apart from
 * the plain-text run, which may be empty when a string preceded a flag. */
export const shellTokens = (source: string): readonly ShellToken[] => {
  const tokens: ShellToken[] = [];
  let rest = source;
  let plain = "";
  let scanPosition = 0;

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

        if (kind === "flag" && scanPosition > 0) {
          const previous = source[scanPosition - 1];

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
      scanPosition += 1;
      continue;
    }

    flush();
    tokens.push(found);
    rest = rest.slice(found.value.length);
    scanPosition += found.value.length;
  }

  flush();

  return tokens;
};
