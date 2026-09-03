import { describe, expect, it } from "bun:test";
import { parseEnvLines } from "./env-lines";

describe("env lines", () => {
  it("reads KEY=VALUE lines into a map", () => {
    expect(
      parseEnvLines(
        "OPENAI_API_KEY=sk-1\n\n# a comment\n  BASE_URL = https://x/v1=2 "
      )
    ).toEqual({
      problem: null,
      values: { BASE_URL: "https://x/v1=2", OPENAI_API_KEY: "sk-1" },
    });
  });

  it("reads nothing from an empty textarea", () => {
    expect(parseEnvLines("")).toEqual({ problem: null, values: {} });
  });

  it("names a line without a separator", () => {
    expect(parseEnvLines("API_KEY=x\njust words").problem).toContain(
      "just words"
    );
  });

  it("refuses a lower case name", () => {
    expect(parseEnvLines("api_key=x").problem).toContain("api_key");
  });

  it("refuses an empty value", () => {
    expect(parseEnvLines("API_KEY=").problem).toContain("API_KEY");
  });
});
