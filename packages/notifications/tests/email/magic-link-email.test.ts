import { describe, expect, test } from "bun:test";
import { magicLinkEmail } from "../../src/email/magic-link-email";

describe("magicLinkEmail", () => {
  test("addresses the message to the person signing in", () => {
    const message = magicLinkEmail({
      email: "charlie@example.com",
      expiresInMinutes: 5,
      url: "https://anpord.dev/magic/abc",
    });

    expect(message.to).toBe("charlie@example.com");
  });

  test("states the expiry the caller configured rather than a fixed one", () => {
    const message = magicLinkEmail({
      email: "charlie@example.com",
      expiresInMinutes: 15,
      url: "https://anpord.dev/magic/abc",
    });

    expect(message.text).toContain("15 minutes");
  });

  test("carries the link on its own line so clients linkify it", () => {
    const message = magicLinkEmail({
      email: "charlie@example.com",
      expiresInMinutes: 5,
      url: "https://anpord.dev/magic/abc",
    });

    expect(message.text.split("\n")).toContain("https://anpord.dev/magic/abc");
  });
});
