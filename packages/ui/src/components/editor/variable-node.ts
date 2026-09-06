import { VARIABLE_PATTERN, variableAtStart } from "@anpord/template/syntax";
import { Node, nodeInputRule } from "@tiptap/core";

/* nodeInputRule replaces exactly what it matched, so the whole `{{name}}` must
   be inside it or the leftover braces read as an escape. */
const TYPED_VARIABLE = new RegExp(`(?:^|[^{])(${VARIABLE_PATTERN})$`);

/* Round-trips verbatim: the markdown escaper would turn `{{customer_name}}`
   into `{{customer\_name}}`, which never interpolates. */
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

  renderMarkdown: (node) => `{{${node.attrs?.name ?? ""}}}`,

  markdownTokenizer: {
    name: "variable",
    level: "inline",
    start: (src) => src.indexOf("{{"),
    tokenize: (src) => {
      const match = variableAtStart().exec(src);
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
