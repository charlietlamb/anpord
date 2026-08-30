import { FileSystem } from "@effect/platform";
import { Effect } from "effect";

const SUFFIX = ".eval.ts";
const SKIPPED = new Set(["node_modules", "dist", "build", ".git"]);

const hidden = (segment: string) => segment.startsWith(".");

const wanted = (path: string) => {
  const segments = path.split("/");

  return (
    path.endsWith(SUFFIX) &&
    segments.every((segment) => !(SKIPPED.has(segment) || hidden(segment)))
  );
};

export const evalFilesIn = (directory: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const entries = yield* fs.readDirectory(directory, { recursive: true });

    return entries.filter(wanted).sort();
  }).pipe(Effect.withSpan("Cli.evalFilesIn"));
