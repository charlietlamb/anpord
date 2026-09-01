import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

const db = drizzle(process.env.DATABASE_URL as string);
const id = process.env.RUN_ID as string;
const r = await db.execute(sql`
  select r.status as run, r.failure, c.status as cell, t.status as trial,
         t.sandbox_id is not null as sandbox, t.prepared,
         (select count(*)::int from eval_event e where e.trial_internal_id=t.internal_id) as events
  from eval_run r left join eval_cell c on c.run_internal_id = r.internal_id
  left join eval_trial t on t.cell_internal_id = c.internal_id
  where r.id = ${id}`);
console.log(JSON.stringify(r.rows[0] ?? {}));
process.exit(0);
