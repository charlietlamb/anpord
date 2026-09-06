import { expect, test } from "bun:test";
import { highlight } from "./highlight";

test("highlights JSON with both themes and escapes recorded content", async () => {
  const html = await highlight(
    '{"name":"<script>","count":3,"ok":true}',
    "json"
  );
  expect(html).toContain('class="shiki');
  expect(html).toContain("--shiki-dark:");
  expect(html).toContain("&#x3C;script>");
  expect(html).not.toContain("<script>");
});

test("keeps non-JSON output as escaped plain text", async () => {
  const html = await highlight("<script>Unknown item</script>", "text");
  expect(html).toContain("Unknown item");
  expect(html).not.toContain("<script>");
});
