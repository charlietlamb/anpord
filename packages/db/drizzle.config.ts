import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const envPath = resolve(root, ".env");

/* An explicit DATABASE_URL wins over the repo .env. Without this precedence a
   push aimed at a local container silently retargets whatever the checked-in
   environment points at, which is production. */
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
  /* The table files, not schema.ts: drizzle-kit collects named exports, and
     schema.ts nests every table inside one `schema` object, so pointing at it
     finds zero tables and generates a migration that drops the database. */
  schema: "./src/schema/**/*.ts",
  /* The workflow engine creates and migrates its own cluster_* tables. Without
     this filter drizzle-kit sees tables it has no schema for and generates
     DROP statements for them. */
  tablesFilter: ["!cluster_*"],
});
