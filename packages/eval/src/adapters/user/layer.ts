import { Effect, Layer } from "effect";
import { SimulatedUser } from "../../ports/simulated-user";
import { makeHarnessUser } from "./harness-user";
import { makeLlmUser } from "./llm-user";

export const SimulatedUserLive = Layer.effect(
  SimulatedUser,
  Effect.gen(function* () {
    const harness = yield* makeHarnessUser;
    const llm = yield* makeLlmUser;
    return SimulatedUser.of({
      join: ({ context, user }) =>
        user.harness === undefined
          ? llm({ context, user })
          : harness({ context, user }),
    });
  })
);
