import { pathToFileURL } from "node:url";
import type {
  EvalCaseDefinition,
  EvalDefinition,
  SingleCaseDefinition,
} from "./types";

const SOURCE_URL = Symbol.for("anpord.sourceUrl");

interface CallSite {
  readonly getFileName: () => string | undefined;
}

const AUTHORED = /\.[cm]?[jt]sx?$/;

const FILE_URL = /^file:\/\//;
const SELF = import.meta.url;

const authored = (name: string) =>
  AUTHORED.test(name) &&
  !name.includes("node:") &&
  !SELF.endsWith(name.replace(FILE_URL, ""));

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

export function evalCase(definition: SingleCaseDefinition): EvalDefinition {
  const { prompt, variants, trials, ...subject } = definition;

  return suite({
    cases: [subject as EvalCaseDefinition],
    id: subject.id,
    name: subject.name,
    prompt,
    variants,
    trials,
  });
}

export const sourceUrlOf = (definition: EvalDefinition): string | undefined =>
  (definition as { [SOURCE_URL]?: string })[SOURCE_URL];
