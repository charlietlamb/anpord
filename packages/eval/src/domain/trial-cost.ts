import type { Option } from "effect";
import type { CostComponent } from "./cost-component";
import {
  harnessComponent,
  modelComponent,
  platformComponent,
  sandboxComponent,
} from "./cost-layers";
import type { HarnessUsage } from "./harness-event";
import type { ModelPrice } from "./model-price";

/* Pure over values the caller holds, so every classification rule is testable as
   a table rather than through a database. */
export const breakdownOf = (input: {
  readonly authMethodId: string | null;
  readonly harness: string;
  readonly hasOwnSandboxCredential: boolean;
  readonly model: string;
  readonly modelMs: number;
  readonly price: Option.Option<ModelPrice>;
  readonly provider: string;
  readonly sandboxMs: number;
  readonly usage: HarnessUsage | null;
}): readonly CostComponent[] => [
  modelComponent(input),
  harnessComponent(input),
  sandboxComponent({
    hasOwnCredential: input.hasOwnSandboxCredential,
    provider: input.provider,
    sandboxMs: input.sandboxMs,
  }),
  platformComponent(),
];
