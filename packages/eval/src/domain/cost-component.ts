import {
  CostClassification,
  CostComponentName,
} from "@anpord/schema/domain/eval-costs";
import { type Option, Schema } from "effect";

/* Decoded, not asserted: both columns are plain text with no check constraint. */
export const classificationOf: (
  value: string
) => Option.Option<CostClassification> =
  Schema.decodeUnknownOption(CostClassification);

export const componentNameOf: (
  value: string
) => Option.Option<CostComponentName> =
  Schema.decodeUnknownOption(CostComponentName);

/* `amountNanos` is null for anything not priced in money; zero would sum as free. */
export interface CostComponent {
  readonly amountNanos: bigint | null;
  readonly classification: CostClassification;
  readonly component: CostComponentName;
  readonly detail: Readonly<Record<string, unknown>>;
  readonly explanation: string;
  readonly source: string;
}
