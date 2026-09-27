import { expect, test } from "bun:test";
import type { ReactElement } from "react";
import { prerender } from "react-dom/static";
import { preloadable } from "../../src/lib/preloadable";

const markupOf = async (element: ReactElement) => {
  const { prelude } = await prerender(element, { onError: () => undefined });
  return new Response(prelude).text();
};

const Label = ({ name }: { readonly name: string }) => <p>{name}</p>;

test("renders the component once a failed chunk load succeeds on retry", async () => {
  let attempts = 0;
  const Panel = preloadable(() => {
    attempts += 1;
    return attempts === 1
      ? Promise.reject(new Error("chunk failed"))
      : Promise.resolve(Label);
  });

  await expect(markupOf(<Panel.Component name="Calls" />)).rejects.toThrow(
    "chunk failed"
  );
  expect(await markupOf(<Panel.Component name="Calls" />)).toBe("<p>Calls</p>");
  expect(attempts).toBe(2);
});
