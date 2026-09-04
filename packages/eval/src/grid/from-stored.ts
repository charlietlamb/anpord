import type { HarnessName, ProviderName } from "../domain/cell";
import type { RequestedProfile } from "../domain/harness-profile";
import type { CellTask } from "../repositories/run-tasks-query";
import type { GridCase } from "./cell";

const pairOf = (
  name: string | null | undefined,
  source: string | null | undefined
) => (name == null || source == null ? null : { name, source });

export const caseFrom = (subject: CellTask): GridCase => ({
  /* Read back, because a worker rebuilds every dispatched run from here: a
     declaration that survives only in the request is one no run beyond the
     first ever sees. */
  cache:
    subject.cacheKey === null || subject.cachePath === null
      ? undefined
      : { key: subject.cacheKey, path: subject.cachePath },
  identity: subject.identity,
  name: subject.name,
  prepare: pairOf(subject.prepareName, subject.prepareSource),
  source: subject.source ?? { kind: "empty" },
  validator: pairOf(subject.validatorName, subject.validatorSource),
  variables: {},
  verify: subject.verifyCommand,
});

/** The profile a stored cell ran under, read back whole rather than by name:
 * a resumed run writes the same files, and only the row holds them. */
export const profileFrom = (subject: CellTask): RequestedProfile | null =>
  subject.profile == null
    ? null
    : {
        env: subject.profile.env,
        files: subject.profile.files,
        install: subject.profile.install,
        name: subject.profile.name,
        run: subject.profile.run,
        systemPrompt: subject.profile.systemPrompt,
      };

/** The task a stored cell ran, for a caller that will resolve its own
 * credentials. */
export const taskFrom = (subject: CellTask) => ({
  credentials: {
    harnessConnectionId:
      subject.cell.harnessCredentialConnectionId ?? undefined,
    sandboxConnectionId:
      subject.cell.sandboxCredentialConnectionId ?? undefined,
  },
  harness: subject.cell.harness as HarnessName,
  harnessVersion: subject.cell.harnessVersion,
  model: subject.cell.model,
  profile: profileFrom(subject),
  provider: subject.cell.provider as ProviderName,
});
