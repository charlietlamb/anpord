import type { EvalCase } from "@sphynx/schema/domain/eval-definition";
import type { CaseDefinition } from "./case-identity";
import { renderPrompt } from "./prompt";

export const caseDefinitionOf = (
  suite: { readonly prompt: string },
  subject: EvalCase
): CaseDefinition => ({
  cache: subject.cache ?? null,
  maxTurns: subject.maxTurns,
  prepare: subject.prepare,
  prompt: renderPrompt(suite.prompt, subject.variables),
  source: subject.source,
  timeoutMs: subject.timeoutMs,
  user: subject.user,
  validator: subject.validator,
  verify: subject.verify,
});
