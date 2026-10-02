import type {
  HarnessUsage,
  ModelSpend,
} from "@sphynx/schema/domain/harness-event";
import type { TrialOutcome } from "@sphynx/schema/domain/trial";
import { Effect, Option } from "effect";
import { judgmentsIn } from "../domain/judgments";
import { costOf, type ModelPrice } from "../domain/model-price";
import { breakdownOf } from "../domain/trial-cost";
import { ModelPrices } from "../ports/model-source";

export interface TrialSpend {
  readonly authMethodId: string | null;
  readonly harness: string;
  readonly hasOwnSandboxCredential: boolean;
  readonly model: string;
  readonly outcome: TrialOutcome;
  readonly provider: string;
  readonly usage: HarnessUsage | null;
  readonly userSpend: Option.Option<ModelSpend>;
}

const withCost = (
  usage: HarnessUsage | null,
  price: Option.Option<ModelPrice>
) =>
  usage === null
    ? null
    : Option.match(price, {
        onNone: () => usage,
        onSome: (found) => ({ ...usage, costUsd: costOf(usage, found) }),
      });

export const makeTrialPricing = Effect.gen(function* () {
  const prices = yield* ModelPrices;

  const rateFor = (model: string) =>
    prices
      .forModel(model)
      .pipe(Effect.orElseSucceed(() => Option.none<ModelPrice>()));

  const spendPriced = (model: string, usage: HarnessUsage | null) =>
    Effect.map(rateFor(model), (price) => ({ model, price, usage }));

  return (spend: TrialSpend) =>
    Effect.gen(function* () {
      const price = yield* rateFor(spend.model);
      const usage = withCost(spend.usage, price);
      const user = yield* Option.match(spend.userSpend, {
        onNone: () => Effect.succeed(undefined),
        onSome: ({ model, usage: spent }) => spendPriced(model, spent),
      });
      const judges = yield* Effect.forEach(
        judgmentsIn(spend.outcome.validations),
        (judgment) => spendPriced(judgment.model, judgment.usage ?? null)
      );

      return {
        components: breakdownOf({
          authMethodId: spend.authMethodId,
          harness: spend.harness,
          hasOwnSandboxCredential: spend.hasOwnSandboxCredential,
          judges,
          model: spend.model,
          modelMs: spend.outcome.modelMs,
          price,
          provider: spend.provider,
          sandboxMs: spend.outcome.sandboxMs,
          usage,
          user,
        }),
        usage,
      };
    }).pipe(Effect.withSpan("TrialPricing.price"));
});
