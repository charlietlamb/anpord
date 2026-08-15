import { Node, nodeInputRule } from "@tiptap/core";

const VARIABLE = /^\{\{\s*([\w.-]+)\s*\}\}/;

/**
 * Anchored to the end so it fires as the final brace is typed. The whole
 * `{{name}}` must be inside the match: nodeInputRule replaces exactly what it
 * matched, so a narrower capture leaves the outer braces behind and the text
 * becomes `{{{{name}}}}`.
 */
const TYPED_VARIABLE = /(?:^|[^{])(\{\{\s*([\w.-]+)\s*\}\})$/;

/**
 * A variable is an atom, not prose. Serialising it through the markdown escaper
 * would turn `{{customer_name}}` into `{{customer\_name}}` and the model would
 * never interpolate it, so the node round-trips its own text verbatim.
 */
export const Variable = Node.create({
  name: "variable",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      name: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-variable"),
        renderHTML: (attributes) => ({ "data-variable": attributes.name }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-variable]" }];
  },

  /**
   * The markdown tokenizer only runs when content is parsed, so without this a
   * variable typed by hand stays plain text until the document is reloaded.
   */
  addInputRules() {
    return [
      nodeInputRule({
        find: TYPED_VARIABLE,
        type: this.type,
        getAttributes: (match) => ({ name: match[2] }),
      }),
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "span",
      { ...HTMLAttributes, class: "prompt-variable" },
      `{{${node.attrs.name}}}`,
    ];
  },

  renderText({ node }) {
    return `{{${node.attrs.name}}}`;
  },

  parseMarkdown: (token) => ({
    type: "variable",
    attrs: { name: (token as { name?: string }).name ?? "" },
  }),

  /** Emitted verbatim, so the escaper never sees the underscore. */
  renderMarkdown: (node) => `{{${node.attrs?.name ?? ""}}}`,

  /** marked has no concept of {{…}}, so the syntax is registered here. */
  markdownTokenizer: {
    name: "variable",
    level: "inline",
    start: (src) => src.indexOf("{{"),
    tokenize: (src) => {
      const match = VARIABLE.exec(src);
      if (!match) {
        return;
      }
      return {
        type: "variable",
        raw: match[0],
        name: match[1],
      } as never;
    },
  },
});
