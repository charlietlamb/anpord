import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

/* The core build, not Shiki's full bundle: that ships every grammar and theme
   it has, megabytes for the few used here. */
let pending: Promise<HighlighterCore> | undefined;

const create = () =>
  createHighlighterCore({
    /* Not Oniguruma: the wasm engine cannot be bundled without a plugin. */
    engine: createJavaScriptRegexEngine(),
    langs: [
      import("shiki/langs/typescript.mjs"),
      import("shiki/langs/json.mjs"),
      import("shiki/langs/bash.mjs"),
      import("shiki/langs/markdown.mjs"),
    ],
    themes: [
      import("shiki/themes/github-light-default.mjs"),
      import("shiki/themes/github-dark-default.mjs"),
    ],
  });

/** Shared so a second caller waits on the first load rather than starting another. */
export const highlighter = () => {
  pending ??= create();
  return pending;
};

export type CodeLanguage = "bash" | "json" | "markdown" | "text" | "typescript";

/** Shiki writes light colours inline and dark ones as custom properties, so one
 * pass follows the app's theme without re-highlighting. */
export const highlight = async (code: string, lang: CodeLanguage) =>
  (await highlighter()).codeToHtml(code, {
    defaultColor: "light",
    lang,
    themes: { dark: "github-dark-default", light: "github-light-default" },
  });

export type ShellTokenKind =
  | "comment"
  | "flag"
  | "operator"
  | "string"
  | "text";

/* Shiki's own palette is four hues, which would be the loudest thing in a list
   whose point is a failed command. Its scopes are semantic, so the grammar
   does the parsing and the theme keeps deciding what things look like. */
const SCOPES: readonly (readonly [string, ShellTokenKind])[] = [
  ["comment", "comment"],
  ["constant.other.option", "flag"],
  ["keyword.operator", "operator"],
  ["punctuation.section.function", "operator"],
  ["entity.name.command", "text"],
  ["string", "string"],
];

/* A token carries its scopes outermost first, and the innermost is often only
   punctuation, so the outermost match is the one that says what this is. */
const kindOf = (scopes: readonly string[]): ShellTokenKind =>
  SCOPES.find(([prefix]) =>
    scopes.some((scope) => scope.startsWith(prefix))
  )?.[1] ?? "text";

export interface ShellToken {
  readonly kind: ShellTokenKind;
  readonly value: string;
}

/** Bash separated by what each part is, rather than by a pattern of our own. */
export const shellTokens = async (
  command: string
): Promise<readonly ShellToken[]> => {
  const { tokens } = (await highlighter()).codeToTokens(command, {
    includeExplanation: true,
    lang: "bash",
    theme: "github-dark-default",
  });

  return tokens.flat().map((token) => ({
    kind: kindOf(
      (token.explanation?.[0]?.scopes ?? []).map(({ scopeName }) => scopeName)
    ),
    value: token.content,
  }));
};
