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

/**
 * What a finished trial cost, layer by layer.
 *
 * Pure, over values the caller already holds: no store, no clock, no rate
 * lookup of its own. That keeps every classification rule testable as a table
 * rather than through a database.
 */
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
