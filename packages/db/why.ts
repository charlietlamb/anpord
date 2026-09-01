import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

const db = drizzle(process.env.DATABASE_URL as string);
const r = await db.execute(sql`
  select r.id, r.status as run, c.status as cell, t.status as trial, t.failure,
         extract(epoch from (now() - r.created_at))::int as age
  from eval_run r left join eval_cell c on c.run_internal_id=r.internal_id
  left join eval_trial t on t.cell_internal_id=c.internal_id
  where r.organization_id='f82e866a-a223-439f-9257-093486e90ace'
  order by r.created_at desc limit 1`);
const row = r.rows[0] as Record<string, unknown>;
console.log(
  "run:",
  row.run,
  "| cell:",
  row.cell,
  "| trial:",
  row.trial,
  "| age:",
  row.age
);
console.log("FAILURE:", String(row.failure ?? "(still null)").slice(0, 900));
process.exit(0);
