import { describe, expect, test } from "bun:test";
import {
  validationCapture,
  validationExecution,
} from "@anpord/schema/domain/eval-validations";
import { redactSecrets } from "@anpord/schema/domain/secret-text";
import { redactValidation } from "../../src/domain/secret-redaction";

const OPENAI = "sk-proj-4fQ9x2LmPq7RtY8uVw3ZaB1cD";
const GITHUB = "ghp_16C7e42F292c6912E7710c838347Ae178B4a";
const JWT =
  "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";

describe("redacting credentials from evidence text", () => {
  test.each([
    ["an OpenAI key", `key=${OPENAI}`, "key=[redacted]"],
    [
      "an Anthropic key",
      "ANTHROPIC_API_KEY=sk-ant-api03-Xy7Kq2Lm9Pz4Rt6Vw1Ab3Cd5Ef",
      "ANTHROPIC_API_KEY=[redacted]",
    ],
    [
      "an Autumn key",
      '{"secretKey":"am_sk_test_x"}',
      '{"secretKey":"[redacted]"}',
    ],
    ["a Stripe secret key", "sk_live_51HqLyjWDarjtT1zdp7dc", "[redacted]"],
    [
      "an anpord key",
      "ANPORD_API_KEY=anp_Zk3PqL9mRt2VwX7yBn4Cd8Ef",
      "ANPORD_API_KEY=[redacted]",
    ],
    ["a GitHub token", `token ${GITHUB} used`, "token [redacted] used"],
    [
      "a fine grained GitHub token",
      "github_pat_11ABCDEFG0123456789_abcdefghijklmnop",
      "[redacted]",
    ],
    [
      "a Slack token",
      "xoxb-123456789012-1234567890123-AbCdEfGhIjKl",
      "[redacted]",
    ],
    ["an AWS access key id", "AKIAIOSFODNN7EXAMPLE", "[redacted]"],
    [
      "a Google API key",
      "AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q",
      "[redacted]",
    ],
    ["a JWT", `cookie=${JWT}`, "cookie=[redacted]"],
    [
      "a bearer header, keeping the scheme",
      "Authorization: Bearer 9f8e7d6c5b4a39281706f5e4d3c2b1a0",
      "Authorization: Bearer [redacted]",
    ],
    [
      "a bearer header inside JSON",
      '{"authorization":"bearer abc123def456ghi789jkl"}',
      '{"authorization":"bearer [redacted]"}',
    ],
    [
      "the password in a connection string",
      "DATABASE_URL=postgres://app:s3cr3t-pw@db:5432/app",
      "DATABASE_URL=postgres://app:[redacted]@db:5432/app",
    ],
    [
      "a private key block",
      "-----BEGIN RSA PRIVATE KEY-----\nMIIEow\nIBAAK\n-----END RSA PRIVATE KEY-----\nok",
      "[redacted]\nok",
    ],
  ])("redacts %s", (_, text, expected) => {
    expect(redactSecrets(text)).toBe(expected);
  });

  test.each([
    ["prose about risk", "a risk-assessment-framework-for-teams was used"],
    ["a slug that starts like a key", "sk-hynix-memory-prices-rising-again"],
    ["a word in a sentence", "the task-sk-list is empty"],
    ["prose about bearer tokens", "Send a Bearer authentication-scheme header"],
    ["a short anpord key preview", "your key starts anp_7Kq"],
    ["a git sha", "HEAD is at 9f8e7d6c5b4a39281706f5e4d3c2b1a0"],
    ["a UUID", "trial 3f2b8c1e-4d5a-4f6b-9c7d-8e9f0a1b2c3d"],
    ["a URL", "listening on http://localhost:4173/api?token=short"],
    ["a JSON result", '{"passed":true,"message":"Evidence checked"}'],
    ["the key prefix alone", "keys look like sk- or ghp_ or xoxb-"],
  ])("leaves %s alone", (_, text) => {
    expect(redactSecrets(text)).toBe(text);
  });

  test("redacts a value the trial knows is secret, raw and JSON escaped", () => {
    expect(
      redactSecrets(
        'pw=hunter2-rotated "x" and {"pw":"hunter2-rotated \\"x\\""}',
        ['hunter2-rotated "x"']
      )
    ).toBe('pw=[redacted] and {"pw":"[redacted]"}');
  });

  test("does not redact a known value short enough to be ordinary text", () => {
    expect(redactSecrets("port 4173 is open", ["4173", "true"])).toBe(
      "port 4173 is open"
    );
  });

  test("redacts every text field of a validation record", () => {
    const capture = validationCapture();
    const redacted = redactValidation(
      {
        ...validationExecution(
          { id: "code:0", index: 0, name: "check", kind: "code" },
          0
        ),
        message: `used ${GITHUB}`,
        input: capture({ prepared: { secretKey: "am_sk_test_x" } }),
        output: capture({ passed: false, token: "rotated-secret-value" }),
        calls: [
          {
            index: 0,
            method: "exec",
            startedAt: 0,
            durationMs: 1,
            input: capture(["env"]),
            output: capture({ stdout: `OPENAI_API_KEY=${OPENAI}\nHOME=/root` }),
            error: null,
          },
        ],
        logs: [
          {
            index: 0,
            at: 0,
            level: "stdout",
            value: capture(`Authorization: Bearer ${JWT}`, "text"),
          },
        ],
      },
      ["rotated-secret-value"]
    );

    expect([
      redacted.message,
      redacted.input.text,
      redacted.output.text,
      redacted.calls[0]?.output.text,
      redacted.logs[0]?.value.text,
    ]).toEqual([
      "used [redacted]",
      '{"prepared":{"secretKey":"[redacted]"}}',
      '{"passed":false,"token":"[redacted]"}',
      '{"stdout":"OPENAI_API_KEY=[redacted]\\nHOME=/root"}',
      "Authorization: Bearer [redacted]",
    ]);
  });
});

describe("redacting before evidence is capped", () => {
  test("a key that straddles the capture limit leaves no fragment", () => {
    const captured = validationCapture()(
      `${"x".repeat(15_995)} ${OPENAI}`,
      "text"
    );

    expect([captured.text.slice(15_990), captured.truncated]).toEqual([
      "xxxxx [red",
      true,
    ]);
  });

  test("a known value that straddles the capture limit leaves no fragment", () => {
    const captured = validationCapture(true, ["opaque-access-token-1"])(
      `${"x".repeat(15_995)} opaque-access-token-1`,
      "text"
    );

    expect(captured.text.slice(15_990)).toBe("xxxxx [red");
  });
});
