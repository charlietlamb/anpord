import { API_PROGRAM } from "@anpord/schema/domain/api-mocks";
import type { PublicStartEvalRequest } from "@anpord/schema/public/evals-api";
import { Effect } from "effect";
import type { ApiDefinition } from "../mock-api/define";
import { bundle } from "./eval-bundle";
import { packageProgram } from "./program-package";

export const compileApis = (
  entry: string,
  definitions: readonly ApiDefinition[]
): Effect.Effect<Readonly<Record<string, string>>, Error> =>
  Effect.gen(function* () {
    if (definitions.length === 0) {
      return {};
    }
    const names = definitions.map(({ name }) => name);
    if (new Set(names).size !== names.length) {
      return yield* Effect.fail(new Error("Duplicate API mock name"));
    }
    const { source } = yield* bundle(
      `import definition from ${JSON.stringify(entry)};
import { runApiServers } from "anpord/api/runtime";
runApiServers(definition.api ?? []);`,
      entry,
      { minify: true }
    );
    const program = packageProgram(
      "workspace/.anpord/api",
      "server.mjs",
      source
    );
    return {
      ...program.files,
      [API_PROGRAM]: JSON.stringify({
        entry: program.entry.slice("workspace/".length),
      }),
    };
  });

export const withApis = (
  task: PublicStartEvalRequest["tasks"][number],
  files: Readonly<Record<string, string>>
): PublicStartEvalRequest["tasks"][number] => {
  if (Object.keys(files).length === 0) {
    return task;
  }
  const profile = task.profile ?? { name: "anpord-api", files: {} };
  for (const path of Object.keys(files)) {
    if (profile.files[path] !== undefined) {
      throw new Error(`Profile file ${path} is reserved for API mocks`);
    }
  }
  return {
    ...task,
    profile: { ...profile, files: { ...profile.files, ...files } },
  };
};
