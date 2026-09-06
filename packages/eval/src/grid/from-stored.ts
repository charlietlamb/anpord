import { EvalValidator } from "@anpord/schema/domain/evals";
import { Option, Schema } from "effect";
import type { RequestedProfile } from "../domain/harness-profile";
import { namesOf } from "../domain/stored-cell";
import type { CellTask } from "../repositories/run-tasks-query";
import type { GridCase } from "./cell";

const pairOf = (
  name: string | null | undefined,
  source: string | null | undefined
) => (name == null || source == null ? null : { name, source });

export const caseFrom = (subject: CellTask): GridCase => ({
  /* A worker rebuilds every dispatched run from here, so nothing may live only
     in the original request. */
  cache:
    subject.cacheKey === null || subject.cachePath === null
      ? undefined
      : { key: subject.cacheKey, path: subject.cachePath },
  identity: subject.identity,
  name: subject.name,
  prepare: pairOf(subject.prepareName, subject.prepareSource),
  source: subject.source ?? { kind: "empty" },
  validator:
    subject.validatorConfig == null
      ? pairOf(subject.validatorName, subject.validatorSource)
      : Schema.decodeUnknownSync(EvalValidator)(subject.validatorConfig),
  variables: {},
  verify: subject.verifyCommand,
});

/* Read back whole, not by name: only the row holds the files a resume must write. */
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

/* None where the row names a harness or provider this build no longer has. */
export const taskFrom = (subject: CellTask) =>
  Option.map(namesOf(subject.cell), (names) => ({
    credentials: {
      harnessConnectionId:
        subject.cell.harnessCredentialConnectionId ?? undefined,
      sandboxConnectionId:
        subject.cell.sandboxCredentialConnectionId ?? undefined,
    },
    harness: names.harness,
    harnessVersion: subject.cell.harnessVersion,
    model: subject.cell.model,
    profile: profileFrom(subject),
    provider: names.provider,
  }));
