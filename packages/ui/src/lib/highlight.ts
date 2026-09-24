import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

let pending: Promise<HighlighterCore> | undefined;

const create = () =>
  createHighlighterCore({
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

export const highlighter = () => {
  pending ??= create();
  return pending;
};

export type CodeLanguage = "bash" | "json" | "markdown" | "text" | "typescript";

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

const SCOPES: readonly (readonly [string, ShellTokenKind])[] = [
  ["comment", "comment"],
  ["constant.other.option", "flag"],
  ["keyword.operator", "operator"],
  ["punctuation.section.function", "operator"],
  ["entity.name.command", "text"],
  ["string", "string"],
];

const kindOf = (scopes: readonly string[]): ShellTokenKind =>
  SCOPES.find(([prefix]) =>
    scopes.some((scope) => scope.startsWith(prefix))
  )?.[1] ?? "text";

export interface ShellToken {
  readonly kind: ShellTokenKind;
  readonly value: string;
}

const plain = (command: string): readonly ShellToken[] =>
  command === "" ? [] : [{ kind: "text", value: command }];

export const shellTokens = async (
  command: string
): Promise<readonly ShellToken[]> => {
  try {
    const shiki = await highlighter();

    const { tokens } = shiki.codeToTokens(command, {
      includeExplanation: "scopeName",
      lang: "bash",
      theme: "github-dark-default",
    });

    return tokens.flat().map((token) => ({
      kind: kindOf(
        (token.explanation?.[0]?.scopes ?? []).map(({ scopeName }) => scopeName)
      ),
      value: token.content,
    }));
  } catch (error) {
    console.warn("shellTokens fell back", error);

    return plain(command);
  }
};
