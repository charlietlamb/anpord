import { inspect, MigrationRefused } from "../src/migrations/inspect";
import { statusReport } from "../src/migrations/report";
import { databaseUrl } from "../src/migrations/target";

const url = databaseUrl();
if (url === undefined) {
  console.error(
    "No DATABASE_URL. Set it, or put it in .env.local at the repository root."
  );
  process.exit(1);
}

try {
  const inspection = await inspect(url, { confirmDataLoss: false });
  console.log(statusReport(inspection));
  process.exit(inspection.problems.length > 0 ? 1 : 0);
} catch (cause) {
  if (!(cause instanceof MigrationRefused)) {
    throw cause;
  }
  console.error(cause.message);
  process.exit(1);
}
