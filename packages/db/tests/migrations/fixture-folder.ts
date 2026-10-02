import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrationsFolder } from "../../src/migrations/folder";

export interface FixtureMigration {
  readonly sql: string;
  readonly tag: string;
  readonly when: number;
}

export const fixtureFolder = (
  migrations: readonly FixtureMigration[],
  acknowledged: Record<string, string> = {}
) => {
  const root = mkdtempSync(join(tmpdir(), "sphynx-migrations-"));
  mkdirSync(join(root, "meta"));
  writeFileSync(
    join(root, "meta", "_journal.json"),
    JSON.stringify({
      dialect: "postgresql",
      entries: migrations.map((migration, idx) => ({
        breakpoints: true,
        idx,
        tag: migration.tag,
        version: "7",
        when: migration.when,
      })),
      version: "7",
    })
  );
  for (const migration of migrations) {
    writeFileSync(join(root, `${migration.tag}.sql`), migration.sql);
  }
  writeFileSync(join(root, "data-loss.json"), JSON.stringify(acknowledged));
  return migrationsFolder(root);
};
