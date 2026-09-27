import { Duration, type ParseResult } from "effect";
import type { CredentialError } from "../credentials/errors";
import type { SandboxUnavailable } from "./errors";

export type ReapFailure =
  | "connection-deleted"
  | "credential-store-unavailable"
  | "credential-unreadable"
  | "provider-unavailable"
  | "store-unavailable"
  | "unexpected"
  | "unknown-provider";

export type Reaped =
  | { readonly outcome: "destroyed"; readonly sandboxId: string }
  | {
      readonly outcome: "abandoned" | "gave-up" | "retrying";
      readonly reason: ReapFailure;
      readonly sandboxId: string;
    };

type Settled = Exclude<Reaped, { outcome: "destroyed" }>;

export interface ReapSummary {
  readonly abandoned: number;
  readonly destroyed: number;
  readonly failures: readonly {
    readonly count: number;
    readonly outcome: Settled["outcome"];
    readonly reason: ReapFailure;
    readonly sandboxIds: readonly string[];
  }[];
  readonly gaveUp: number;
  readonly retrying: number;
}

const PERMANENT: ReadonlySet<ReapFailure> = new Set([
  "connection-deleted",
  "credential-unreadable",
  "unknown-provider",
]);

const GIVE_UP_AFTER = Duration.hours(24);

const SAMPLE_SIZE = 3;

export const classifyReapFailure = (
  error: CredentialError | ParseResult.ParseError | SandboxUnavailable
): ReapFailure => {
  switch (error._tag) {
    case "CredentialError":
      if (error.code === "not-found") {
        return "connection-deleted";
      }
      return error.code === "internal"
        ? "credential-store-unavailable"
        : "credential-unreadable";
    case "ParseError":
      return "unknown-provider";
    case "SandboxUnavailable":
      return "provider-unavailable";
    default:
      return error satisfies never;
  }
};

export const settleFailure = (
  sandboxId: string,
  reason: ReapFailure,
  leakedFor: Duration.Duration
): Settled => {
  if (PERMANENT.has(reason)) {
    return { outcome: "abandoned", reason, sandboxId };
  }
  return Duration.greaterThanOrEqualTo(leakedFor, GIVE_UP_AFTER)
    ? { outcome: "gave-up", reason, sandboxId }
    : { outcome: "retrying", reason, sandboxId };
};

export const summarizeReaps = (reaped: readonly Reaped[]): ReapSummary => {
  const groups = new Map<
    string,
    Omit<ReapSummary["failures"][number], "sandboxIds"> & {
      count: number;
      sandboxIds: Set<string>;
    }
  >();

  for (const one of reaped) {
    if (one.outcome === "destroyed") {
      continue;
    }
    const key = `${one.outcome} ${one.reason}`;
    const group = groups.get(key) ?? {
      count: 0,
      outcome: one.outcome,
      reason: one.reason,
      sandboxIds: new Set<string>(),
    };
    group.count += 1;
    group.sandboxIds.add(one.sandboxId);
    groups.set(key, group);
  }

  const counted = (outcome: Reaped["outcome"]) =>
    reaped.filter((one) => one.outcome === outcome).length;

  return {
    abandoned: counted("abandoned"),
    destroyed: counted("destroyed"),
    failures: [...groups.values()].map((group) => ({
      ...group,
      sandboxIds: [...group.sandboxIds].slice(0, SAMPLE_SIZE),
    })),
    gaveUp: counted("gave-up"),
    retrying: counted("retrying"),
  };
};
