import { API_PROGRAM } from "@sphynx/schema/domain/api-mocks";
import { Effect } from "effect";
import type { ApiDefinition } from "../mock-api/define";
import { EvalDefinitionInvalid } from "./definition-errors";
import { bundle } from "./eval-bundle";
import { packageProgram } from "./program-package";
import { type DefinitionRef, importsDefinition } from "./runner-source";
import type { VariantInput } from "./types";

export const compileApis = (
  ref: DefinitionRef,
  definitions: readonly ApiDefinition[]
): Effect.Effect<Readonly<Record<string, string>>, Error> =>
  Effect.gen(function* () {
    if (definitions.length === 0) {
      return {};
    }
    const names = definitions.map(({ name }) => name);
    if (new Set(names).size !== names.length) {
      return yield* Effect.fail(
        new EvalDefinitionInvalid({ reason: "Duplicate API mock name" })
      );
    }
    const { source } = yield* bundle(
      `${importsDefinition(ref)}
import { runApiServers } from "sphynx-sh/api/runtime";
runApiServers(definition.api ?? []);`,
      ref.entry,
      { minify: true }
    );
    const program = packageProgram(
      "workspace/.sphynx/api",
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
  variant: VariantInput,
  files: Readonly<Record<string, string>>
): VariantInput => {
  if (Object.keys(files).length === 0) {
    return variant;
  }
  const profile = variant.profile ?? { name: "sphynx-api", files: {} };
  for (const path of Object.keys(files)) {
    if (profile.files[path] !== undefined) {
      throw new Error(`Profile file ${path} is reserved for API mocks`);
    }
  }
  return {
    ...variant,
    profile: { ...profile, files: { ...profile.files, ...files } },
  };
};
