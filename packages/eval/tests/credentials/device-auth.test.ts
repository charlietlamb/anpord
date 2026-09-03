import { describe, expect, it } from "bun:test";
import { parseDeviceChallenge } from "../../src/credentials/device-challenge";

describe("Codex device authentication", () => {
  it("extracts the verification URL and one-time code", () => {
    expect(
      parseDeviceChallenge(
        "Open https://auth.openai.com/codex/device and enter [94mABCD-12345[0m"
      )
    ).toEqual({
      code: "ABCD-12345",
      verificationUrl: "https://auth.openai.com/codex/device",
    });
  });
});
