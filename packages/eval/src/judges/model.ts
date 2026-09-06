import type {
  CredentialValues,
  ResolvedCredential,
} from "@anpord/schema/domain/credentials";
import type { EvalJudge } from "@anpord/schema/domain/eval-judges";
import { Context, Data, type Effect, type Redacted, Schema } from "effect";

export const JudgeCompletion = Schema.Struct({
  text: Schema.String,
  responseId: Schema.optional(Schema.String),
  model: Schema.optional(Schema.String),
  harnessVersion: Schema.optional(Schema.String),
  sessionId: Schema.optional(Schema.String),
  refusal: Schema.optional(Schema.String),
  incomplete: Schema.optional(Schema.Boolean),
  toolCalls: Schema.optional(Schema.Array(Schema.String)),
  usage: Schema.optional(
    Schema.Struct({
      inputTokens: Schema.NonNegativeInt,
      outputTokens: Schema.NonNegativeInt,
      totalTokens: Schema.NonNegativeInt,
    })
  ),
});
export type JudgeCompletion = typeof JudgeCompletion.Type;

import type { ProviderName } from "../domain/cell";
import type { ValidationObserver } from "../ports/scorer";

export class JudgeFailed extends Data.TaggedError("JudgeFailed")<{
  readonly message: string;
}> {}

interface JudgeContext {
  readonly harnessCredential: Redacted.Redacted<ResolvedCredential>;
  readonly organizationId: string;
  readonly provider: ProviderName;
  readonly sandboxCredentials?: Redacted.Redacted<CredentialValues>;
}

export interface JudgeRequest {
  readonly capture?: boolean;
  readonly context: JudgeContext;
  readonly index?: number;
  readonly input: string;
  readonly judge: EvalJudge;
  readonly onRequest?: (input: unknown) => Effect.Effect<void>;
  readonly onValidation?: ValidationObserver;
  readonly output: string;
}

export class JudgeModel extends Context.Tag("@anpord/eval/JudgeModel")<
  JudgeModel,
  {
    readonly complete: (
      request: JudgeRequest
    ) => Effect.Effect<JudgeCompletion, JudgeFailed>;
  }
>() {}
