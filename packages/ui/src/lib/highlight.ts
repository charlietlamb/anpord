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
      import("shiki/langs/bash.mjs"),
      import("shiki/langs/markdown.mjs"),
    ],
    themes: [
      import("shiki/themes/github-light-default.mjs"),
      import("shiki/themes/catppuccin-mocha.mjs"),
    ],
  });

/** Shared so a second caller waits on the first load rather than starting another. */
export const highlighter = () => {
  pending ??= create();
  return pending;
};

export type CodeLanguage = "bash" | "markdown" | "typescript";

/** Shiki writes light colours inline and dark ones as custom properties, so one
 * pass follows the app's theme without re-highlighting. */
export const highlight = async (code: string, lang: CodeLanguage) =>
  (await highlighter()).codeToHtml(code, {
    defaultColor: "light",
    lang,
    themes: { dark: "catppuccin-mocha", light: "github-light-default" },
  });
