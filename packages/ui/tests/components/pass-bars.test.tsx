import { describe, expect, test } from "bun:test";
import { PassBars } from "@sphynx/ui/components/evals/pass-bars";
import { renderToStaticMarkup } from "react-dom/server";

const squares = (html: string, tone: string) =>
  html.match(new RegExp(`rounded-\\[3px\\] ${tone}`, "g"))?.length ?? 0;

describe("PassBars", () => {
  test("draws a square per scored trial", () => {
    const html = renderToStaticMarkup(
      <PassBars tally={{ passed: 3, scored: 4 }} />
    );

    expect(squares(html, "bg-success")).toBe(3);
    expect(squares(html, "bg-destructive")).toBe(1);
    expect(html).toContain("3 of 4 passed");
    expect(html).toContain(">3/4<");
  });

  test("caps the squares and keeps the share", () => {
    const html = renderToStaticMarkup(
      <PassBars tally={{ passed: 15, scored: 30 }} />
    );

    expect(squares(html, "bg-success")).toBe(5);
    expect(squares(html, "bg-destructive")).toBe(5);
  });

  test("says when nothing was scored", () => {
    expect(
      renderToStaticMarkup(<PassBars tally={{ passed: 0, scored: 0 }} />)
    ).toContain("Not scored");
  });
});
