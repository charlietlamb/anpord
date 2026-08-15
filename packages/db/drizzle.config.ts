import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const envPath = resolve(root, ".env");
const envUrl = existsSync(envPath)
  ? readFileSync(envPath, "utf8")
      .match(/^DATABASE_URL=(.+)$/m)?.[1]
      ?.trim()
      .replace(/^(['"])(.*)\1$/, "$2")
  : undefined;

export default defineConfig({
  dialect: "postgresql",
  ...((process.env.DATABASE_URL ?? envUrl)
    ? { dbCredentials: { url: (process.env.DATABASE_URL ?? envUrl) as string } }
    : {}),
  out: "./drizzle",
  schema: "./src/schema.ts",
});
