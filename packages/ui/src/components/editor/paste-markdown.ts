import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";

/** Fenced code, indented code, and inline backticks are deliberately absent:
 * pasting a snippet should keep it verbatim rather than reinterpret whatever
 * markdown-like punctuation the snippet happens to contain. */
const MARKDOWN_PATTERNS = [
  /^#{1,6}\s/m,
  /^\s*[-*+]\s+/m,
  /^\s*\d+\.\s+/m,
  /^\s*>\s/m,
  /^\s*(?:[-*_]\s*){3,}$/m,
  /\*\*[^*\n]+\*\*/,
  /\[[^\]\n]+\]\([^)\n]+\)/,
  /^\|.*\|$/m,
];

/** A single emphasis pair reads as prose far more often than as markup, so
 * plain sentences are left to paste as themselves. */
export const looksLikeMarkdown = (text: string): boolean =>
  MARKDOWN_PATTERNS.some((pattern) => pattern.test(text));

/**
 * Tiptap parses markdown on setContent but not on paste, so pasted documents
 * would otherwise arrive as literal `#` and `-` characters.
 */
export const PasteMarkdown = Extension.create({
  name: "pasteMarkdown",

  addProseMirrorPlugins() {
    const { editor } = this;

    return [
      new Plugin({
        props: {
          handlePaste(_view, event) {
            if (event.clipboardData?.types.includes("text/html")) {
              return false;
            }

            const text = event.clipboardData?.getData("text/plain");

            if (!(editor.markdown && text && looksLikeMarkdown(text))) {
              return false;
            }

            editor.commands.insertContent(editor.markdown.parse(text));
            return true;
          },
        },
      }),
    ];
  },
});
