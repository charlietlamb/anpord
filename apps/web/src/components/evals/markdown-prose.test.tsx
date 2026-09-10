import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownProse } from "./markdown-prose";

/* Markdown used to be styled from outside with descendant selectors, which is
   how its code drifted away from the code everywhere else. These assert it
   renders through the shared components rather than a copy of them. */
describe("code inside markdown", () => {
  test("sets a word of code the way the rest of the interface does", () => {
    const html = renderToStaticMarkup(
      <MarkdownProse text="Set `FOO` first." />
    );

    expect(html).toContain("bg-foreground/[0.07]");
    expect(html).toContain("box-decoration-clone");
    expect(html).toContain("FOO");
  });

  test("sets a fenced block on the same ground as any other block", () => {
    const html = renderToStaticMarkup(
      <MarkdownProse text={"```sh\nbun test\n```"} />
    );

    expect(html).toContain("bg-muted/50");
    expect(html).toContain("bun test");
  });

  /* The fence's own text is what a copy button should hand over, not whatever
     the highlighted children happen to render. */
  test("offers the fence's text to copy", () => {
    const html = renderToStaticMarkup(
      <MarkdownProse text={"```\nbun run check\n```"} />
    );

    expect(html).toContain("Copy");
  });

  test("still renders the rest of the markdown", () => {
    const html = renderToStaticMarkup(<MarkdownProse text={"- one\n- two"} />);

    expect(html).toContain("<li");
    expect(html).toContain("one");
  });
});
