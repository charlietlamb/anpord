import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization } from "../auth/organizations";
import { user } from "../auth/users";
import { evalCell } from "./eval-cells";

/** The accepted reading for a cell, and what a later run is measured against.
 *
 * Promoted deliberately rather than inferred from the most recent run. If the
 * latest reading silently became the reference, a bad day would be adopted as
 * the new normal and the drift this table exists to expose would be absorbed
 * one run at a time. */
export const evalBaseline = pgTable(
  "eval_baseline",
  {
    internalId: text("internal_id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    cellKey: text("cell_key").notNull(),
    /* Restricted rather than cascaded: deleting the run a baseline points at
       would otherwise remove the reference without anyone choosing to. */
    cellInternalId: text("cell_internal_id")
      .notNull()
      .references(() => evalCell.internalId, { onDelete: "restrict" }),
    promotedBy: text("promoted_by").references(() => user.id, {
      onDelete: "set null",
    }),
    promotedAt: timestamp("promoted_at").notNull().defaultNow(),
  },
  (table) => [
    /* One current baseline per cell key per organization. Promoting again
       replaces the row rather than accumulating candidates. */
    uniqueIndex("eval_baseline_organization_id_cell_key_idx").on(
      table.organizationId,
      table.cellKey
    ),
    index("eval_baseline_organization_id_idx").on(table.organizationId),
  ]
);
