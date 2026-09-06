import {
  CostClassification as CostClassificationSchema,
  CostComponentName as CostComponentNameSchema,
} from "@anpord/schema/domain/evals";
import { type Option, Schema } from "effect";

export type CostClassification = typeof CostClassificationSchema.Type;

export type CostComponentName = typeof CostComponentNameSchema.Type;

/* Decoded, not asserted: both columns are plain text with no check constraint. */
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

/* `amountNanos` is null for anything not priced in money; zero would sum as free. */
export interface CostComponent {
  readonly amountNanos: bigint | null;
  readonly classification: CostClassification;
  readonly component: CostComponentName;
  readonly detail: Readonly<Record<string, unknown>>;
  readonly explanation: string;
  readonly source: string;
}
