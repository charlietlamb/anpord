import { describe, expect, it } from "bun:test";
import { promptKey, promptPrefix } from "../../src/client/cache/keys";

describe("cache keys", () => {
  it("keys an absent channel apart from any named one", () => {
    /* The organisation decides which channel answers a bare get, and may
       rename it. Keying the two alike would serve one caller's default to
       another organisation whose default is a different channel. */
    const bare = promptKey({ id: "support-reply" });

    expect(bare).not.toBe(
      promptKey({ id: "support-reply", channel: "production" })
    );
    expect(bare).not.toBe(promptKey({ id: "support-reply", channel: "live" }));
  });

  it("keys each named channel separately", () => {
    expect(promptKey({ channel: "staging", id: "a" })).not.toBe(
      promptKey({ channel: "production", id: "a" })
    );
  });

  it("keys a pinned version apart from a channel", () => {
    expect(promptKey({ id: "a", version: 3 })).not.toBe(
      promptKey({ channel: "production", id: "a" })
    );
  });

  it("separates an answer carrying history from one without", () => {
    expect(promptKey({ id: "a", includeVersions: true })).not.toBe(
      promptKey({ id: "a" })
    );
  });

  it("shares one prefix across every key for a prompt", () => {
    const prefix = promptPrefix("support-reply");

    for (const selector of [
      { id: "support-reply" },
      { channel: "staging", id: "support-reply" },
      { id: "support-reply", version: 2 },
    ]) {
      expect(promptKey(selector).startsWith(prefix)).toBe(true);
    }
  });

  it("keeps an id with a slash from colliding with another prompt", () => {
    expect(promptKey({ id: "email/welcome" })).not.toBe(
      promptKey({ id: "email:welcome" })
    );
  });
});
