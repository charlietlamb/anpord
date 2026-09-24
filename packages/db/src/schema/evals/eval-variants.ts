import { index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { evalCase } from "./eval-cases";

export const evalVariant = pgTable(
  "eval_variant",
  {
    internalId: text("internal_id").primaryKey(),
    caseInternalId: text("case_internal_id")
      .notNull()
      .references(() => evalCase.internalId, { onDelete: "cascade" }),
    harness: text("harness").notNull(),
    model: text("model").notNull(),
    sandbox: text("sandbox").notNull(),
    profile: text("profile"),
    userModel: text("user_model"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("eval_variant_identity_key")
      .on(
        table.caseInternalId,
        table.harness,
        table.model,
        table.sandbox,
        table.profile,
        table.userModel
      )
      .nullsNotDistinct(),
    index("eval_variant_case_internal_id_idx").on(table.caseInternalId),
  ]
);
