import type { FileSystem } from "@effect/platform";
import type { Effect } from "effect";
import { type ImportedSuite, importEvalsJson } from "../imports/evals-json";

export type Importer = (
  path: string
) => Effect.Effect<
  ImportedSuite,
  { readonly message: string },
  FileSystem.FileSystem
>;

/** A format is an entry here, so adding one adds an entry rather than editing
 * the command. Each name carries the importer it names, so the parsed option
 * is the importer itself and no lookup can miss. */
export const FORMATS: [string, Importer][] = [["evals-json", importEvalsJson]];
