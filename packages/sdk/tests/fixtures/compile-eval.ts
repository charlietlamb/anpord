import { ConfigProvider, Effect } from "effect";
import { compileEvalEffect } from "../../src/evals/compiler";

export const compileFixture = (file: string) =>
  Effect.runPromise(
    compileEvalEffect(file).pipe(
      Effect.withConfigProvider(ConfigProvider.fromMap(new Map()))
    )
  );
