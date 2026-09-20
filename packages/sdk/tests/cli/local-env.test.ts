import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { localEnv } from "../../src/cli/local-env";

const withFiles = (files: Readonly<Record<string, string>>) => {
  const directory = mkdtempSync(join(tmpdir(), "anpord-env-"));

  for (const [name, contents] of Object.entries(files)) {
    writeFileSync(join(directory, name), contents);
  }

  return directory;
};

describe("what a local run is given", () => {
  it("forwards an address", () => {
    const directory = withFiles({ ".env": "API_BASE=http://localhost:1234" });

    expect(localEnv(directory).API_BASE).toBe("http://localhost:1234");
  });

  it("forwards a bare host and a port", () => {
    const directory = withFiles({
      ".env": "SERVICE_HOST=localhost\nAPP_PORT=3000",
    });

    expect(localEnv(directory)).toMatchObject({
      APP_PORT: "3000",
      SERVICE_HOST: "localhost",
    });
  });

  /* The name says address and the value is one, so only the value can tell
     these apart from the ones above. */
  it.each([
    ["DATABASE_URL", "postgresql://user:pw@host.neon.tech/db?sslmode=require"],
    ["REDIS_URL", "rediss://default:AAbbCCdd@host.upstash.io:6379"],
    ["MONGODB_URI", "mongodb+srv://user:pw@cluster.mongodb.net"],
  ])("withholds %s, whose password is inside it", (name, value) => {
    const directory = withFiles({ ".env": `${name}=${value}` });

    expect(localEnv(directory)[name]).toBeUndefined();
  });

  it.each([
    ["ANTHROPIC_API_KEY", "sk-ant-abc"],
    ["STRIPE_SK", "sk_live_abc"],
    ["GITHUB_PAT", "ghp_abc"],
    ["SUPABASE_SERVICE_ROLE", "eyJhbGciOi"],
    ["SMTP_PASS", "hunter2"],
    ["SESSION_COOKIE", "abc"],
  ])("withholds %s, which names no address", (name, value) => {
    const directory = withFiles({ ".env": `${name}=${value}` });

    expect(localEnv(directory)[name]).toBeUndefined();
  });

  it("prefers .env.local to .env", () => {
    const directory = withFiles({
      ".env": "API_BASE=http://localhost:1",
      ".env.local": "API_BASE=http://localhost:2",
    });

    expect(localEnv(directory).API_BASE).toBe("http://localhost:2");
  });

  it("reads a quoted value", () => {
    const directory = withFiles({ ".env": `API_BASE="http://localhost:5"` });

    expect(localEnv(directory).API_BASE).toBe("http://localhost:5");
  });

  /* The shell is the last word, so a directory with no files is not empty. */
  it("takes an address from the shell", () => {
    process.env.ANPORD_TEST_URL = "http://localhost:4321";

    try {
      expect(localEnv(withFiles({})).ANPORD_TEST_URL).toBe(
        "http://localhost:4321"
      );
    } finally {
      process.env.ANPORD_TEST_URL = undefined;
    }
  });

  it("lets the shell override a file", () => {
    process.env.API_BASE = "http://localhost:8888";

    try {
      const directory = withFiles({ ".env": "API_BASE=http://localhost:1" });

      expect(localEnv(directory).API_BASE).toBe("http://localhost:8888");
    } finally {
      process.env.API_BASE = undefined;
    }
  });
});
