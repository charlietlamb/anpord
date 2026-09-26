import { migrationsFolder } from "../src/migrations/folder";

const problems = migrationsFolder().problems();
if (problems.length > 0) {
  console.error(
    `Migrations need attention:\n${problems.map((problem) => `  ${problem}`).join("\n")}`
  );
  process.exit(1);
}
console.log("Migrations are in order, and every data loss is written down.");
