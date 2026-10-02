import {
  EvalHomeRange,
  EvalHomeVerdict,
} from "@sphynx/schema/domain/eval-home";
import { parseAsString, parseAsStringLiteral } from "nuqs";

export const homeParsers = {
  range: parseAsStringLiteral(EvalHomeRange.literals)
    .withDefault("7d")
    .withOptions({ clearOnDefault: true }),
  reason: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
  suite: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
  variant: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
  verdict: parseAsStringLiteral(EvalHomeVerdict.literals),
};
