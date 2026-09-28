import type { Tx } from "@anpord/db/query";
import { evalBatch } from "@anpord/db/schema/evals/eval-batches";
import type { IdempotencyKey } from "@anpord/schema/public/runner-api";
import { and, count, eq, sql } from "drizzle-orm";

export type Refusal =
  | { readonly kind: "keyTaken" }
  | { readonly inFlight: number; readonly kind: "overLimit" };

interface Admission {
  readonly idempotencyKey: IdempotencyKey | null;
  readonly limit: number | null;
  readonly organizationId: string;
}

export const runningHosted = (organizationId: string) =>
  and(
    eq(evalBatch.organizationId, organizationId),
    eq(evalBatch.status, "running"),
    eq(evalBatch.local, false)
  );

const keyHeld = async (tx: Tx, organizationId: string, key: IdempotencyKey) => {
  const held = await tx
    .select({ internalId: evalBatch.internalId })
    .from(evalBatch)
    .where(
      and(
        eq(evalBatch.organizationId, organizationId),
        eq(evalBatch.idempotencyKey, key)
      )
    )
    .limit(1);
  return held.length > 0;
};

export const refusalFor = async (
  tx: Tx,
  input: Admission
): Promise<Refusal | null> => {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext(${input.organizationId}))`
  );

  if (input.idempotencyKey !== null) {
    const taken = await keyHeld(tx, input.organizationId, input.idempotencyKey);
    if (taken) {
      return { kind: "keyTaken" };
    }
  }

  if (input.limit === null) {
    return null;
  }

  const [busy] = await tx
    .select({ running: count() })
    .from(evalBatch)
    .where(runningHosted(input.organizationId));
  const running = busy?.running ?? 0;

  return running >= input.limit
    ? { inFlight: running, kind: "overLimit" }
    : null;
};
