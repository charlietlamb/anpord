import { createHash } from "node:crypto";
import type {
  CaseCache,
  EvalPrepare,
  EvalSource,
  EvalValidator,
} from "@sphynx/schema/domain/eval-definition";
import type { EvalUser } from "@sphynx/schema/domain/eval-turns";

export interface CaseDefinition {
  readonly cache: CaseCache | null;
  readonly maxTurns: number | null;
  readonly prepare: EvalPrepare | null;
  readonly prompt: string;
  readonly source: EvalSource;
  readonly timeoutMs: number | null;
  readonly user: EvalUser | null;
  readonly validator: EvalValidator | null;
  readonly verify: string | null;
}

const validatorOf = (validator: EvalValidator | null) => {
  if (validator === null) {
    return "";
  }
  if ("source" in validator) {
    return validator.source;
  }
  const { sourceFiles: _sourceFiles, ...execution } = validator;
  return JSON.stringify(execution);
};

const limitsOf = ({ maxTurns, timeoutMs }: CaseDefinition) =>
  maxTurns === null && timeoutMs === null
    ? []
    : [`limits ${maxTurns ?? ""} ${timeoutMs ?? ""}`];

const sourceOf = (source: EvalSource) => {
  if (source.kind === "empty") {
    return "empty";
  }
  if (source.kind === "repo") {
    return `repo ${source.url} ${source.ref ?? ""}`;
  }
  return `files ${Object.entries(source.files)
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([path, content]) => `${path} ${content}`)
    .join("")}`;
};

export const definitionHashOf = (input: CaseDefinition): string =>
  createHash("sha256")
    .update(
      [
        input.prompt,
        input.prepare?.source ?? "",
        validatorOf(input.validator),
        input.verify ?? "",
        sourceOf(input.source),
        input.user === null ? "" : JSON.stringify(input.user),
        input.cache === null ? "" : `${input.cache.key} ${input.cache.path}`,
        ...limitsOf(input),
      ].join("\u0000")
    )
    .digest("hex")
    .slice(0, 32);
