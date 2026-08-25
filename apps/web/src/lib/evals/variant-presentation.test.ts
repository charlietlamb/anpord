import { describe, expect, it } from "bun:test";
import {
  harnessLabel,
  harnessPresentation,
  modelPresentation,
  providerPresentation,
} from "./variant-presentation";

describe("naming a variant", () => {
  it("names the harnesses and providers the contract defines", () => {
    expect(harnessPresentation("codex").label).toBe("Codex");
    expect(providerPresentation("daytona").label).toBe("Daytona");
    expect(providerPresentation("e2b").label).toBe("E2B");
    expect(providerPresentation("upstash").label).toBe("Upstash Box");
    expect(providerPresentation("modal").label).toBe("Modal");
    expect(providerPresentation("cloudflare").label).toBe("Cloudflare");
    expect(providerPresentation("vercel").label).toBe("Vercel");
  });

  /** 523 stored cells name a harness this build no longer defines, and one
   * names `none`. A screen that threw on those could not show the history
   * that makes a verdict legible. */
  it("falls back rather than throwing on a value it does not know", () => {
    expect(harnessPresentation("none").label).toBe("none");
    expect(providerPresentation("future").label).toBe("future");
    expect(modelPresentation("none").label).toBe("none");
  });

  it("recognises a model family rather than an exact name", () => {
    const known = modelPresentation("gpt-5-codex");
    const future = modelPresentation("gpt-6");

    expect(future.Icon).toBe(known.Icon);
  });

  /** The cell key hashes both, so a column naming one without the other
   * compares against a different identity. */
  it("keeps the harness and its version together", () => {
    expect(harnessLabel("codex", "0.144.4")).toBe("Codex 0.144.4");
  });
});
