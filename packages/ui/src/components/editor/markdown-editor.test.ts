import { beforeAll, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

let toMarkdown: (input: string) => string;
let typeMarkdown: (input: string) => string;

beforeAll(async () => {
  const view = new Window();
  Object.assign(globalThis, {
    document: view.document,
    navigator: view.navigator,
    window: view,
  });

  const { Editor } = await import("@tiptap/core");
  const { Markdown } = await import("@tiptap/markdown");
  const { StarterKit } = await import("@tiptap/starter-kit");
  const { Variable } = await import("./variable-node");

  const element = view.document.createElement("div");
  view.document.body.appendChild(element);

  const editor = new Editor({
    content: "",
    element: element as never,
    extensions: [StarterKit, Markdown, Variable],
  });

  /** Input rules only run through the text-input path a keystroke takes. */
  typeMarkdown = (input) => {
    editor.commands.clearContent();
    for (const character of input) {
      const { from, to } = editor.state.selection;
      const handled = editor.view.someProp("handleTextInput", (handler) =>
        Boolean(
          handler(editor.view, from, to, character, () => editor.state.tr)
        )
      );
      if (!handled) {
        editor.view.dispatch(editor.state.tr.insertText(character, from, to));
      }
    }
    return editor.getMarkdown().trim();
  };

  toMarkdown = (input) => {
    editor.commands.setContent(input, {
      contentType: "markdown",
      emitUpdate: false,
    });
    return editor.getMarkdown().trim();
  };
});

/**
 * A prompt is sent to a model verbatim, so anything the editor rewrites is a
 * change the author never made. Underscores are the sharp edge: the markdown
 * escaper would turn {{customer_name}} into {{customer\_name}} and the variable
 * would silently stop interpolating.
 */
describe("markdown round-trip", () => {
  test("variables survive underscores, dots and hyphens", () => {
    expect(toMarkdown("Answer {{customer_name}} politely.")).toBe(
      "Answer {{customer_name}} politely."
    );
    expect(toMarkdown("Use {{topic.name}} and {{a-b}}.")).toBe(
      "Use {{topic.name}} and {{a-b}}."
    );
  });

  test("a variable typed by hand becomes one, unduplicated", () => {
    expect(typeMarkdown("cool {{asdf}} end")).toBe("cool {{asdf}} end");
    expect(typeMarkdown("hi {{customer_name}}")).toBe("hi {{customer_name}}");
  });

  test("structure is preserved", () => {
    expect(toMarkdown("## Instructions\n\nBe brief.")).toBe(
      "## Instructions\n\nBe brief."
    );
    expect(toMarkdown("- one\n- two")).toBe("- one\n- two");
  });

  test("code and emphasis are not escaped away", () => {
    expect(toMarkdown("Use `code` and **bold**.")).toBe(
      "Use `code` and **bold**."
    );
  });
});
