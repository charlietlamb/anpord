import type { StartBatchRequest } from "@anpord/schema/domain/evals";
import { ConfigProvider, Effect } from "effect";
import { compileEvalEffect } from "../../src/evals/compiler";

export const compileFixture = (file: string): Promise<StartBatchRequest> =>
  Effect.runPromise(
    compileEvalEffect(file).pipe(
      Effect.withConfigProvider(ConfigProvider.fromMap(new Map()))
    )
  );
