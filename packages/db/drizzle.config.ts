import { defineConfig } from "drizzle-kit";
import { databaseUrl } from "./src/migrations/target";

const url = databaseUrl();

export default defineConfig({
  dialect: "postgresql",
  ...(url ? { dbCredentials: { url } } : {}),
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
