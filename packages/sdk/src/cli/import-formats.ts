import type { FileSystem } from "@effect/platform";
import type { Effect } from "effect";
import { type ImportedSuite, importEvalsJson } from "../imports/evals-json";
import { importYamlCases } from "../imports/yaml-cases";

export type Importer = (
  path: string
) => Effect.Effect<
  ImportedSuite,
  { readonly message: string },
  FileSystem.FileSystem
>;

/* Each name carries its importer, so the parsed option is the importer itself
   and no lookup can miss. */
export const FORMATS: [string, Importer][] = [
  ["evals-json", importEvalsJson],
  ["yaml", importYamlCases],
];
