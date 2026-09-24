import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";

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

export const looksLikeMarkdown = (text: string): boolean =>
  MARKDOWN_PATTERNS.some((pattern) => pattern.test(text));

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
