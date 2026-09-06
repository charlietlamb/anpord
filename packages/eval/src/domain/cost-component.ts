import {
  CostClassification as CostClassificationSchema,
  CostComponentName as CostComponentNameSchema,
} from "@anpord/schema/domain/evals";
import { type Option, Schema } from "effect";

/**
 * How much of a cost is known, and on what basis.
 *
 * The distinction is the point. A public-rate calculation is not an invoice,
 * a subscription's marginal price is not zero, and a cost the platform absorbs
 * is not one the customer paid. Collapsing any of those into a number makes a
 * total that reads as authoritative and is not.
 *
 * Derived from the wire contract rather than restated, so the set a summary
 * sums over and the set the API publishes cannot drift apart.
 */
export type CostClassification = typeof CostClassificationSchema.Type;

export type CostComponentName = typeof CostComponentNameSchema.Type;

/**
 * The classification and component a stored row names.
 *
 * Decoded rather than asserted: both columns are plain text with no check
 * constraint. A classification this build does not name matches no branch of
 * the summary, so casting one silently dropped its amount from every total
 * while leaving the result marked complete.
 */
export const classificationOf: (
  value: string
) => Option.Option<CostClassification> = Schema.decodeUnknownOption(
  CostClassificationSchema
);

export const componentNameOf: (
  value: string
) => Option.Option<CostComponentName> = Schema.decodeUnknownOption(
  CostComponentNameSchema
);

/**
 * What one layer of a trial cost.
 *
 * `amountNanos` is null for anything not priced in money -- included, managed,
 * unknown -- rather than zero, which would read as free and sum as free.
 */
export interface CostComponent {
  readonly amountNanos: bigint | null;
  readonly classification: CostClassification;
  readonly component: CostComponentName;
  readonly detail: Readonly<Record<string, unknown>>;
  readonly explanation: string;
  readonly source: string;
}
