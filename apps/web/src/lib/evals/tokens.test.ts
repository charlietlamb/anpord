import { describe, expect, it } from "bun:test";
import { dollars, percent, tokens } from "./tokens";

describe("dollars", () => {
  /* An agent run can cost a twentieth of a cent or several dollars, and one
     precision cannot serve both: two decimals buries the cheap runs at $0.00
     and four gives the dear ones a precision the estimate does not have. */
  it("keeps a sub-cent cost distinct from free", () => {
    expect(dollars(0.0004)).toBe("$0.0004");
  });

  it("rounds a dollar-scale cost to cents", () => {
    expect(dollars(2.487)).toBe("$2.49");
  });

  it("keeps three digits between a cent and a dollar", () => {
    expect(dollars(0.247)).toBe("$0.247");
  });

  it("says zero plainly", () => {
    expect(dollars(0)).toBe("$0");
  });
});

describe("percent", () => {
  it("rounds to whole percent", () => {
    expect(percent(0.917)).toBe("92%");
  });

  it("reads a full hit as a hundred", () => {
    expect(percent(1)).toBe("100%");
  });
});

describe("tokens", () => {
  it("leaves a small count alone", () => {
    expect(tokens(742)).toBe("742");
  });

  it("shortens thousands", () => {
    expect(tokens(106_457)).toBe("106.5k");
  });

  it("shortens millions", () => {
    expect(tokens(2_340_000)).toBe("2.3M");
  });
});
