import { describe, expect, it } from "bun:test";
import { isSameOrigin } from "../../src/http/request/same-origin";

const TRUSTED = ["https://www.anpord.com", "http://localhost:3005"];

const request = (
  method: string,
  headers: Record<string, string> = {}
): Request =>
  new Request("https://api.anpord.com/api/prompts", { method, headers });

describe("isSameOrigin", () => {
  it("allows a read whatever its origin", () => {
    expect(
      isSameOrigin(request("GET", { origin: "https://evil.example" }), TRUSTED)
    ).toBe(true);
  });

  it("allows a write from the dashboard", () => {
    expect(
      isSameOrigin(
        request("POST", { origin: "https://www.anpord.com" }),
        TRUSTED
      )
    ).toBe(true);
  });

  /** The attack this exists to stop: another site driving a signed-in session
   * through the browser, which attaches the cookie for it. */
  it("refuses a write from another site", () => {
    expect(
      isSameOrigin(
        request("POST", {
          cookie: "anpord.session_token=abc",
          origin: "https://evil.example",
        }),
        TRUSTED
      )
    ).toBe(false);
  });

  it("refuses a delete from another site", () => {
    expect(
      isSameOrigin(
        request("DELETE", { origin: "https://evil.example" }),
        TRUSTED
      )
    ).toBe(false);
  });

  it("refuses an origin that merely starts with a trusted one", () => {
    expect(
      isSameOrigin(
        request("POST", { origin: "https://www.anpord.com.evil.example" }),
        TRUSTED
      )
    ).toBe(false);
  });

  /** A server-side caller sends no origin and no cookie. Refusing those would
   * break every non-browser client without closing anything. */
  it("allows a write with neither origin nor cookie", () => {
    expect(isSameOrigin(request("POST"), TRUSTED)).toBe(true);
  });

  /** A cookie with no origin cannot come from a browser doing a cross-site
   * request, but it is close enough to one to refuse. */
  it("refuses a cookie-bearing write that names no origin", () => {
    expect(
      isSameOrigin(
        request("POST", { cookie: "anpord.session_token=abc" }),
        TRUSTED
      )
    ).toBe(false);
  });

  it("allows a preflight", () => {
    expect(
      isSameOrigin(
        request("OPTIONS", { origin: "https://evil.example" }),
        TRUSTED
      )
    ).toBe(true);
  });
});
