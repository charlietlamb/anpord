import { expect, test } from "bun:test";
import { SkeletonScope } from "@anpord/ui/components/ui/skeleton-scope";
import { renderToStaticMarkup } from "react-dom/server";

test("a loading scope hides its placeholder content from assistive tech and input", () => {
  const markup = renderToStaticMarkup(
    <SkeletonScope>
      <span>placeholder</span>
    </SkeletonScope>
  );
  expect(markup).toContain('aria-busy="true"');
  expect(markup).toContain("data-skeleton");
  expect(markup).toContain("inert");
});

test("a loaded scope renders its children untouched", () => {
  expect(
    renderToStaticMarkup(
      <SkeletonScope loading={false}>
        <span>loaded</span>
      </SkeletonScope>
    )
  ).toBe("<span>loaded</span>");
});
