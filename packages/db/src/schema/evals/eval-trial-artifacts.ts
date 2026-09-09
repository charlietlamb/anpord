// biome-ignore lint/suspicious/noDeprecatedImports: The object-form primaryKey overload below is current.
import { pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { evalTrial } from "./eval-trials";

/* Keep file bytes off the trial row so polling reads metadata only. */
export const evalTrialArtifact = pgTable(
  "eval_trial_artifact",
  {
    trialInternalId: text("trial_internal_id")
      .notNull()
      .references(() => evalTrial.internalId, { onDelete: "cascade" }),
    sha256: text("sha256").notNull(),
    path: text("path").notNull(),
    content: text("content").notNull(),
  },
  (table) => [primaryKey({ columns: [table.trialInternalId, table.path] })]
);
