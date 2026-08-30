import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

/**
 * A highlighter carrying only what this app renders.
 *
 * Shiki's full bundle is every grammar and theme it ships, which is megabytes
 * for the two languages and two themes used here. The core build takes them
 * one at a time, so the cost is what is actually shown.
 */
let pending: Promise<HighlighterCore> | undefined;

const create = () =>
  createHighlighterCore({
    /* The JavaScript engine rather than Oniguruma: the wasm one cannot be
       bundled without a plugin, and the two grammars here are well within
       what the JS engine handles. */
    engine: createJavaScriptRegexEngine(),
    langs: [
      import("shiki/langs/typescript.mjs"),
      import("shiki/langs/bash.mjs"),
      import("shiki/langs/markdown.mjs"),
    ],
    themes: [
      import("shiki/themes/github-light-default.mjs"),
      import("shiki/themes/catppuccin-mocha.mjs"),
    ],
  });

/** Built once and shared: the wasm engine is expensive to start, and a second
 * caller during the first load should wait rather than start another. */
export const highlighter = () => {
  pending ??= create();
  return pending;
};

export type CodeLanguage = "bash" | "markdown" | "typescript";

/**
 * Both themes in one pass. Shiki writes the light colours inline and the dark
 * ones as custom properties, so the block follows the app's theme without a
 * re-highlight or a second render.
 */
export const highlight = async (code: string, lang: CodeLanguage) =>
  (await highlighter()).codeToHtml(code, {
    defaultColor: "light",
    lang,
    themes: { dark: "catppuccin-mocha", light: "github-light-default" },
  });
