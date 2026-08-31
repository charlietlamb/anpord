import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
const url = process.env.DATABASE_URL;
const db = drizzle(url as string);
const r = await db.execute(sql`
  select r.status as run, c.status as cell,
         c.harness_credential_connection_id is not null as bound,
         t.status as trial, t.sandbox_id is not null as sandbox,
         (select count(*)::int from eval_event e where e.trial_internal_id=t.internal_id) as events
  from eval_run r left join eval_cell c on c.run_internal_id = r.internal_id
  left join eval_trial t on t.cell_internal_id = c.internal_id
  where r.id = 'run_2KK8MZ1TBBSF35W9XJC5B3T3'`);
console.log(JSON.stringify(r.rows[0] ?? {}));
process.exit(0);
