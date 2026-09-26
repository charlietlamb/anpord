import { describe, expect, it } from "bun:test";
import { dataLossIn } from "../../src/migrations/data-loss";

describe("data loss in a migration", () => {
  it("names each statement that throws data away", () => {
    const sql = [
      'DROP TABLE "eval_cell" CASCADE;',
      'ALTER TABLE "eval_run" DROP COLUMN "name";--> statement-breakpoint',
      'ALTER TABLE "eval_run" ALTER COLUMN "trials" SET DATA TYPE smallint;',
      'TRUNCATE "eval_event";',
      "DELETE FROM \"eval_trial\" WHERE status = 'void';",
      'DROP SCHEMA "old";',
    ].join("\n");

    expect(dataLossIn(sql).map((loss) => loss.effect)).toEqual([
      "drops a table",
      "drops a column",
      "changes a column's type",
      "empties a table",
      "deletes rows",
      "drops a schema",
    ]);
  });

  it("quotes the statement on one line", () => {
    expect(dataLossIn('ALTER TABLE "eval_run"\n  DROP COLUMN "name";')).toEqual(
      [
        {
          effect: "drops a column",
          statement: 'ALTER TABLE "eval_run" DROP COLUMN "name"',
        },
      ]
    );
  });

  it("finds nothing in an additive migration or a comment", () => {
    const sql = [
      "-- DROP TABLE was considered and rejected",
      'ALTER TABLE "eval_batch" ADD COLUMN "idempotency_key" text;--> statement-breakpoint',
      'DROP INDEX "eval_batch_started_by_idx";',
      'ALTER TABLE "eval_run" DROP CONSTRAINT "eval_run_status_check";',
    ].join("\n");

    expect(dataLossIn(sql)).toEqual([]);
  });
});
