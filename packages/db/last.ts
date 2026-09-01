import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

const db = drizzle(process.env.DATABASE_URL as string);
const r = await db.execute(sql`
  select r.id, r.status as run, t.status as trial, t.prepared
  from eval_run r join eval_cell c on c.run_internal_id=r.internal_id
  left join eval_trial t on t.cell_internal_id=c.internal_id
  where r.organization_id='f82e866a-a223-439f-9257-093486e90ace'
  order by r.created_at desc limit 1`);
const x = (r.rows[0] ?? {}) as Record<string, unknown>;
console.log(
  `${x.id} run=${x.run} trial=${x.trial} prepared=${JSON.stringify(x.prepared)}`
);
process.exit(0);
