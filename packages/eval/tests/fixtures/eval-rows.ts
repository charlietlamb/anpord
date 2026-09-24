import type { Database } from "@anpord/db/client";
import { organization } from "@anpord/db/schema/auth/organizations";
import { credentialConnection } from "@anpord/db/schema/credentials/connections";
import { evalBatch } from "@anpord/db/schema/evals/eval-batches";
import { evalCaseVersion } from "@anpord/db/schema/evals/eval-case-versions";
import { evalCase } from "@anpord/db/schema/evals/eval-cases";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalSuite } from "@anpord/db/schema/evals/eval-suites";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { evalVariant } from "@anpord/db/schema/evals/eval-variants";

type Db = Database["Type"];

export const seedOrganization = (db: Db, organizationId: string) =>
  db
    .insert(organization)
    .values({
      createdAt: new Date(),
      id: organizationId,
      name: organizationId,
      slug: organizationId,
    })
    .onConflictDoNothing();

export const seedConnection = (
  db: Db,
  input: {
    readonly id: string;
    readonly integrationId: string;
    readonly organizationId: string;
  }
) =>
  db
    .insert(credentialConnection)
    .values({
      authMethodId: "api-key",
      id: input.id,
      integrationId: input.integrationId,
      name: input.id,
      organizationId: input.organizationId,
      scope: "organization",
      sealedPayload: "sealed",
      status: "active",
    })
    .onConflictDoNothing();

export interface SeededRun {
  readonly batchInternalId: string;
  readonly caseInternalId: string;
  readonly runInternalId: string;
  readonly variantInternalId: string;
  readonly versionInternalId: string;
}

export const seedRun = async (
  db: Db,
  input: {
    readonly batchStatus?: string;
    readonly createdAt?: Date;
    readonly local?: boolean;
    readonly organizationId: string;
    readonly runStatus?: string;
    readonly sandbox?: string;
    readonly sandboxConnectionId?: string | null;
    readonly tag: string;
    readonly trialCount?: number;
  }
): Promise<SeededRun> => {
  const createdAt = input.createdAt ?? new Date();
  const seeded = {
    batchInternalId: `ebat_${input.tag}`,
    caseInternalId: `ecas_${input.tag}`,
    runInternalId: `erun_${input.tag}`,
    variantInternalId: `evar_${input.tag}`,
    versionInternalId: `ecav_${input.tag}`,
  };

  await db.insert(evalSuite).values({
    id: `suite-${input.tag}`,
    internalId: `esui_${input.tag}`,
    name: "fixture",
    organizationId: input.organizationId,
  });
  await db.insert(evalCase).values({
    id: `case-${input.tag}`,
    internalId: seeded.caseInternalId,
    name: "fixture",
    organizationId: input.organizationId,
    suiteInternalId: `esui_${input.tag}`,
  });
  await db.insert(evalCaseVersion).values({
    caseInternalId: seeded.caseInternalId,
    definitionHash: input.tag,
    internalId: seeded.versionInternalId,
    prompt: "fix the failing test",
    source: { kind: "empty" },
    verify: "node --test 2>&1",
  });
  await db.insert(evalVariant).values({
    caseInternalId: seeded.caseInternalId,
    harness: "codex",
    internalId: seeded.variantInternalId,
    model: "gpt-5",
    sandbox: input.sandbox ?? "daytona",
  });
  await db.insert(evalBatch).values({
    createdAt,
    internalId: seeded.batchInternalId,
    local: input.local ?? false,
    organizationId: input.organizationId,
    status: input.batchStatus ?? "running",
  });
  await db.insert(evalRun).values({
    batchInternalId: seeded.batchInternalId,
    caseVersionInternalId: seeded.versionInternalId,
    createdAt,
    harnessVersion: "0.144.4",
    internalId: seeded.runInternalId,
    sandboxCredentialConnectionId: input.sandboxConnectionId ?? null,
    status: input.runStatus ?? "running",
    trialCount: input.trialCount ?? 1,
    variantInternalId: seeded.variantInternalId,
  });

  return seeded;
};

export const seedTrial = (db: Db, input: typeof evalTrial.$inferInsert) =>
  db.insert(evalTrial).values(input);
