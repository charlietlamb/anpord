import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

const db = drizzle(process.env.DATABASE_URL as string);
const r = await db.execute(sql`
  select r.status as run, c.status as cell, t.status as trial, t.prepared,
         t.sandbox_id is not null as sandbox,
         extract(epoch from (now() - r.created_at))::int as age
  from eval_run r left join eval_cell c on c.run_internal_id=r.internal_id
  left join eval_trial t on t.cell_internal_id=c.internal_id
  where r.id = ${process.env.RUN_ID as string}`);
const x = (r.rows[0] ?? {}) as Record<string, unknown>;
console.log(
  `run=${x.run} cell=${x.cell} trial=${x.trial} sandbox=${x.sandbox} age=${x.age}s prepared=${JSON.stringify(x.prepared ?? null)}`
);
process.exit(0);
