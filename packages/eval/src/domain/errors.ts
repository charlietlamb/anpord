import { Data, Schema } from "effect";
import { ProviderName } from "./cell";

/** How deep to follow `cause` before giving up, so a cycle cannot hang the
 * thing that is meant to explain a failure. */
const CAUSE_DEPTH = 5;

/**
 * The innermost reason an error carries.
 *
 * Drivers wrap: the message worth reading sits under two or three layers of
 * `cause`, and the outermost one says only that a query failed. Following the
 * chain is what turns "Failed query: insert into eval_trial" into "cannot use
 * a pool after calling end on the pool".
 */
export const reasonOf = (cause: unknown): string => {
  let found = cause;

  for (let depth = 0; depth < CAUSE_DEPTH; depth += 1) {
    if (!(found instanceof Error)) {
      return String(found);
    }

    const inner: unknown = found.cause;

    if (inner === undefined || inner === null) {
      return found.message;
    }

    found = inner;
  }

  return found instanceof Error ? found.message : String(found);
};

export class SandboxUnavailable extends Schema.TaggedError<SandboxUnavailable>(
  "SandboxUnavailable"
)("SandboxUnavailable", {
  provider: ProviderName,
  reason: Schema.String,
}) {}

/**
 * A provider failure, explained by the innermost error it carries.
 *
 * Every sandbox adapter reported one of these, each with its own copy that
 * read `reason.message` and stopped there. Drivers wrap, so that copy recorded
 * "Failed to create sandbox" for a run whose real problem was
 * "connect ECONNREFUSED" one layer down.
 */
export const sandboxUnavailable = (
  provider: typeof ProviderName.Type,
  reason: unknown
) => new SandboxUnavailable({ provider, reason: reasonOf(reason) });

export class HarnessUnavailable extends Schema.TaggedError<HarnessUnavailable>(
  "HarnessUnavailable"
)("HarnessUnavailable", {
  harness: Schema.String,
  reason: Schema.String,
}) {}

/**
 * The workspace a case named could not be read.
 *
 * Distinct from SandboxUnavailable: the sandbox started and did as it was
 * asked. Reporting a repository nobody can clone as a provider outage sends
 * the reader to a status page over what is usually a URL, a ref, or an
 * installation that does not cover the repository.
 */
export class SourceUnavailable extends Schema.TaggedError<SourceUnavailable>(
  "SourceUnavailable"
)("SourceUnavailable", {
  reason: Schema.String,
  url: Schema.String,
}) {}

export class PrepareFailed extends Schema.TaggedError<PrepareFailed>(
  "PrepareFailed"
)("PrepareFailed", { name: Schema.String, reason: Schema.String }) {}

/**
 * A store operation that did not complete.
 *
 * `message` is overridden because the default renders every one of these as
 * "An error has occurred": the operation and the driver's own reason are both
 * carried and neither was ever printed, so a failed run said only that it had
 * failed. Finding that a pool had been closed under a running trial took four
 * runs and a script written to squash the cause by hand.
 */
export class EvalStoreError extends Data.TaggedError("EvalStoreError")<{
  readonly cause: unknown;
  readonly operation: string;
}> {
  override get message() {
    return `${this.operation} failed: ${reasonOf(this.cause)}`;
  }
}

/**
 * Something was asked to run that cannot be.
 *
 * The message is overridden for the reason EvalStoreError's is: the default
 * renders every one of these as "An error has occurred", and the problems it
 * carries are the whole of what a reader needs. A worker refusing a run
 * printed that default and said nothing about why.
 */
export class NotRunnable extends Data.TaggedError("NotRunnable")<{
  readonly id: string;
  readonly problems: readonly string[];
}> {
  override get message() {
    return `${this.id} cannot run: ${this.problems.join(", ")}`;
  }
}

export class UnreadableHarness extends Data.TaggedError("UnreadableHarness")<{
  readonly spec: string;
}> {}

export class UnreadableSource extends Data.TaggedError("UnreadableSource")<{
  readonly spec: string;
}> {
  override get message() {
    return `Could not read "${this.spec}" as a repository. Write it as owner/repo, owner/repo@ref, or a clone url.`;
  }
}

export class ModelsUnreadable extends Data.TaggedError("ModelsUnreadable")<{
  readonly cause: unknown;
  readonly source: string;
}> {}
