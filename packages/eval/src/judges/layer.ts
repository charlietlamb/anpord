import { Effect, Layer } from "effect";
import { makeAgentJudge } from "./agent";
import { JudgeModel } from "./model";
import { makeOpenAIJudge } from "./openai";

export const JudgeModelLive = Layer.effect(
  JudgeModel,
  Effect.gen(function* () {
    const agent = yield* makeAgentJudge;
    const openai = yield* makeOpenAIJudge;
    return JudgeModel.of({
      complete: (request) =>
        request.judge.harness === undefined ? openai(request) : agent(request),
    });
  })
);
