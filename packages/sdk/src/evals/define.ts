import { pathToFileURL } from "node:url";
import type { EvalDefinition } from "./types";

const SOURCE_URL = Symbol.for("anpord.sourceUrl");

interface CallSite {
  readonly getFileName: () => string | undefined;
}

/* A REPL, `node -e` and an internal frame all report a name that is not a file
   on disk. Compiling re-imports whatever is captured here, so anything but a
   real path would re-run the caller rather than load a module. */
const AUTHORED = /\.[cm]?[jt]sx?$/;

/* Whichever file this module ends up in, published or in the workspace: built,
   suite() sits in a bundle rather than in define.ts, so matching a filename
   would skip nothing and capture the SDK itself. */
const FILE_URL = /^file:\/\//;
const SELF = import.meta.url;

const authored = (name: string) =>
  AUTHORED.test(name) &&
  !name.includes("node:") &&
  !SELF.endsWith(name.replace(FILE_URL, ""));

/* suite() runs while the eval module is imported, so the frame below it is the
   file that declared it. Capturing that is what lets a caller import a suite
   and submit it, since compiling bundles the files sitting beside it. */
const callerFile = (): string | undefined => {
  const prepare = Error.prepareStackTrace;

  try {
    Error.prepareStackTrace = (_, frames) => frames;
    const captured = (new Error("locate").stack ?? []) as unknown as CallSite[];

    const file = captured
      .map((frame) => frame.getFileName?.())
      .find(
        (name) =>
          name !== undefined && !name.endsWith("define.ts") && authored(name)
      );

    /* Runtimes disagree on whether a frame carries a path or a URL, and the
       compiler imports this value. */
    return file === undefined || file.startsWith("file:")
      ? file
      : pathToFileURL(file).href;
  } catch {
    return;
  } finally {
    Error.prepareStackTrace = prepare;
  }
};

export function suite<const Definition extends EvalDefinition>(
  definition: Definition
): Definition {
  const file = callerFile();

  return file === undefined
    ? definition
    : Object.defineProperty(definition, SOURCE_URL, {
        enumerable: false,
        value: file,
      });
}

export const sourceUrlOf = (definition: EvalDefinition): string | undefined =>
  (definition as { [SOURCE_URL]?: string })[SOURCE_URL];
