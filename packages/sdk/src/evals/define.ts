import { pathToFileURL } from "node:url";
import { EvalSuiteId } from "@anpord/schema/domain/eval-limits";
import { Schema } from "effect";
import type { EvalDefinition } from "./types";

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

const isSuiteId = Schema.is(EvalSuiteId);

const suiteLabel = (definition: EvalDefinition) =>
  definition.name === undefined ? "A suite" : `Suite "${definition.name}"`;

export const suiteIdProblem = (definition: EvalDefinition) =>
  isSuiteId(definition.id)
    ? null
    : `${suiteLabel(definition)} needs an id: a handle of at most 100 lowercase letters, digits and single hyphens, such as "checkout-flow".`;

export function suite<const Definition extends EvalDefinition>(
  definition: Definition
): Definition {
  const problem = suiteIdProblem(definition);

  if (problem !== null) {
    throw new TypeError(problem);
  }

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
