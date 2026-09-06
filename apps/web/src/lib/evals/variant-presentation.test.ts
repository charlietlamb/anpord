import { describe, expect, it } from "bun:test";
import {
  harnessLabel,
  harnessPresentation,
  modelPresentation,
  sandboxPresentation,
} from "./variant-presentation";

describe("naming a variant", () => {
  it("names the harnesses and sandboxes the contract defines", () => {
    expect(harnessPresentation("codex").label).toBe("Codex");
    expect(sandboxPresentation("daytona").label).toBe("Daytona");
    expect(sandboxPresentation("e2b").label).toBe("E2B");
    expect(sandboxPresentation("upstash").label).toBe("Upstash Box");
    expect(sandboxPresentation("modal").label).toBe("Modal");
    expect(sandboxPresentation("cloudflare").label).toBe("Cloudflare");
    expect(sandboxPresentation("vercel").label).toBe("Vercel");
  });

  /* Stored cells name harnesses this build no longer defines, and one names `none`. */
  it("falls back rather than throwing on a value it does not know", () => {
    expect(harnessPresentation("none").label).toBe("none");
    expect(sandboxPresentation("future").label).toBe("future");
    expect(modelPresentation("none").label).toBe("none");
  });

  it("recognises a model family rather than an exact name", () => {
    const known = modelPresentation("gpt-5-codex");
    const future = modelPresentation("gpt-6");

    expect(future.Icon).toBe(known.Icon);
  });

  /* The cell key hashes both, so naming one without the other compares a different identity. */
  it("keeps the harness and its version together", () => {
    expect(harnessLabel("codex", "0.144.4")).toBe("Codex 0.144.4");
  });

  it("names a profile beside the base it was layered on", () => {
    expect(
      harnessLabel("opencode", "1.18.21", {
        name: "house-style",
        version: "a1b2c3d4e5f60718293a4b5c6d7e8f90",
      })
    ).toBe("OpenCode 1.18.21 · house-style@a1b2c3d4");
  });

  it.each([
    "anpord-api",
    "anpord-cli",
    "anpord-mcp",
  ])("omits the generated %s profile from the label", (name) => {
    expect(
      harnessLabel("codex", "0.153.4", { name, version: "a1b2c3d4" })
    ).toBe("Codex 0.153.4");
  });

  /* `HarnessVersions.command` is the literal `profile`, which says nothing worth printing. */
  it("names only the profile where the base has no version to report", () => {
    expect(
      harnessLabel("command", "profile", {
        name: "site-agent",
        version: "a1b2c3d4e5f60718293a4b5c6d7e8f90",
      })
    ).toBe("site-agent@a1b2c3d4");
  });

  it("leaves a profileless column exactly as it read before", () => {
    expect(harnessLabel("codex", "0.144.4", null)).toBe("Codex 0.144.4");
  });
});
