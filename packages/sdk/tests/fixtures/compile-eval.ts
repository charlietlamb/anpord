import type { PublicStartEvalRequest } from "@anpord/schema/public/evals-api";
import { ConfigProvider, Effect } from "effect";
import { compileEvalEffect } from "../../src/evals/compiler";

export const compileFixture = (file: string): Promise<PublicStartEvalRequest> =>
  Effect.runPromise(
    compileEvalEffect(file).pipe(
      Effect.withConfigProvider(ConfigProvider.fromMap(new Map()))
    )
  );
