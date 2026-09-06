import type {
  CredentialValues,
  ResolvedCredential,
} from "@anpord/schema/domain/credentials";
import type { EvalJudge } from "@anpord/schema/domain/eval-judges";
import { Context, Data, type Effect, type Redacted } from "effect";
import type { ProviderName } from "../domain/cell";

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
  readonly context: JudgeContext;
  readonly input: string;
  readonly judge: EvalJudge;
  readonly output: string;
}

export class JudgeModel extends Context.Tag("@anpord/eval/JudgeModel")<
  JudgeModel,
  {
    readonly complete: (
      request: JudgeRequest
    ) => Effect.Effect<string, JudgeFailed>;
  }
>() {}
