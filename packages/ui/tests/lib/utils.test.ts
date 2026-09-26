import { describe, expect, test } from "bun:test";
import { cn } from "@anpord/ui/lib/utils";

describe("cn", () => {
  test("keeps a theme font size beside a text colour", () => {
    expect(cn("truncate text-label", "text-muted-foreground")).toBe(
      "truncate text-label text-muted-foreground"
    );
  });

  test("still lets a later font size win", () => {
    expect(cn("text-label", "text-xs")).toBe("text-xs");
    expect(cn("text-sm", "text-2xs")).toBe("text-2xs");
  });
});
