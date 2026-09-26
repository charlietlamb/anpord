import { parseArgs } from "node:util";
import { inspect, MigrationRefused } from "../src/migrations/inspect";
import { migrate } from "../src/migrations/migrate";
import { dryRunReport } from "../src/migrations/report";
import { databaseUrl, describeTarget } from "../src/migrations/target";

const { values } = parseArgs({
  options: {
    "confirm-data-loss": { default: false, type: "boolean" },
    "dry-run": { default: false, type: "boolean" },
    record: { type: "string" },
  },
});
const confirmDataLoss = values["confirm-data-loss"] === true;

const url = databaseUrl();
if (url === undefined) {
  console.error(
    "No DATABASE_URL. Set it, or put it in .env.local at the repository root."
  );
  process.exit(1);
}
if (values["dry-run"] && values.record !== undefined) {
  console.error(
    "--record writes to the database, so it cannot be a dry run. Drop one of them."
  );
  process.exit(1);
}

try {
  if (values["dry-run"]) {
    const inspection = await inspect(url, { confirmDataLoss });
    console.log(dryRunReport(inspection));
    process.exit(inspection.problems.length > 0 ? 1 : 0);
  }
  console.log(`Migrating ${describeTarget(url)}.`);
  await migrate(url, { confirmDataLoss, record: values.record });
} catch (cause) {
  if (!(cause instanceof MigrationRefused)) {
    throw cause;
  }
  console.error(cause.message);
  process.exit(1);
}
