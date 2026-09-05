import type { HarnessProfile } from "@anpord/schema/domain/harness-profile";
import type { PublicStartEvalRequest } from "@anpord/schema/public/evals-api";
import { Effect } from "effect";
import type { CliDefinition } from "../mock-cli/define";
import { bundle } from "./eval-bundle";
import { appendInstall } from "./profile-compose";
import { packageProgram } from "./program-package";
import { cliEntry } from "./runner-source";

type EvalTask = PublicStartEvalRequest["tasks"][number];

export interface CompiledCli {
  readonly entry: string;
  readonly files: Readonly<Record<string, string>>;
  readonly name: string;
}

export const compileClis = (
  entry: string,
  definitions: readonly CliDefinition[]
) =>
  Effect.gen(function* () {
    const names = definitions.map(({ name }) => name);
    const duplicate = names.find(
      (name, index) => names.indexOf(name) !== index
    );
    if (duplicate !== undefined) {
      return yield* Effect.fail(new Error(`Duplicate CLI: ${duplicate}`));
    }

    return yield* Effect.forEach(
      definitions,
      (definition, index) =>
        bundle(cliEntry(entry, index), entry, { minify: true }).pipe(
          Effect.map(({ source }) => ({
            ...packageProgram(
              `workspace/.anpord/cli/${index}`,
              "cli.mjs",
              source
            ),
            name: definition.name,
          }))
        ),
      { concurrency: 4 }
    );
  });

export const withClis = (
  task: EvalTask,
  clis: readonly CompiledCli[]
): EvalTask => {
  if (clis.length === 0) {
    return task;
  }

  const profile: HarnessProfile = task.profile ?? {
    files: {},
    name: "anpord-cli",
  };
  const files = { ...profile.files };

  for (const item of clis) {
    for (const [path, source] of Object.entries(item.files)) {
      if (files[path] !== undefined) {
        throw new Error(`Profile file ${path} is reserved for CLI mocks`);
      }
      files[path] = source;
    }
  }

  const install = [
    "mkdir -p ~/.local/bin",
    ...clis.flatMap(({ entry, name }) => {
      const path = entry.slice("workspace/".length);
      return [`chmod +x ${path}`, `ln -sf "$PWD/${path}" ~/.local/bin/${name}`];
    }),
  ].join(" && ");

  return {
    ...task,
    profile: appendInstall({ ...profile, files }, install),
  };
};
