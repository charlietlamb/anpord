/**
 * How much of a cost is known, and on what basis.
 *
 * The distinction is the point. A public-rate calculation is not an invoice,
 * a subscription's marginal price is not zero, and a cost the platform absorbs
 * is not one the customer paid. Collapsing any of those into a number makes a
 * total that reads as authoritative and is not.
 */
export type CostClassification =
  | "actual"
  | "allocated"
  | "estimate"
  | "included"
  | "managed"
  | "unknown";

/**
 * What one layer of a trial cost.
 *
 * `amountNanos` is null for anything not priced in money -- included, managed,
 * unknown -- rather than zero, which would read as free and sum as free.
 */
export interface CostComponent {
  readonly amountNanos: bigint | null;
  readonly classification: CostClassification;
  readonly component: "harness" | "model" | "platform" | "sandbox";
  readonly detail: Readonly<Record<string, unknown>>;
  readonly explanation: string;
  readonly source: string;
}
