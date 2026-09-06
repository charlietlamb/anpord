import { index, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { organization } from "../auth/organizations";
import { evalCell } from "./eval-cells";

/* The first scored reading for a cell key. Written once, never replaced by a later run. */
export const evalBaseline = pgTable(
  "eval_baseline",
  {
    internalId: text("internal_id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    cellKey: text("cell_key").notNull(),
    /* Restricted, so deleting the run a baseline points at is a choice rather than a side effect. */
    cellInternalId: text("cell_internal_id")
      .notNull()
      .references(() => evalCell.internalId, { onDelete: "restrict" }),
  },
  (table) => [
    /* Promoting again replaces the row rather than accumulating candidates. */
    uniqueIndex("eval_baseline_organization_id_cell_key_idx").on(
      table.organizationId,
      table.cellKey
    ),
    index("eval_baseline_cell_internal_id_idx").on(table.cellInternalId),
  ]
);
