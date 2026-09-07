import type { z } from "zod";
import { type answerSchema, getItem } from "./fixtures/catalog";

export interface RequestEvidence {
  readonly failed: boolean;
  readonly id?: string;
  readonly method: "list" | "get";
}

export interface Scenario {
  readonly expected: z.infer<typeof answerSchema>;
  readonly instruction: string;
  readonly name: string;
  readonly requests: readonly RequestEvidence[];
}

export const scenarios = [
  {
    name: "lookup",
    instruction: "Retrieve bolt by id. Return the complete item object.",
    expected: getItem({ id: "bolt" }),
    requests: [{ method: "get", id: "bolt", failed: false }],
  },
  {
    name: "filter-stock",
    instruction:
      'List the inventory. Return {"ids":[...]} containing only hardware items with positive stock, sorted by id.',
    expected: { ids: ["bolt", "tape"] },
    requests: [{ method: "list", failed: false }],
  },
  {
    name: "inventory-value",
    instruction:
      'List the inventory. Calculate the sum of priceCents multiplied by stock for every item. Return {"totalValueCents":number}.',
    expected: { totalValueCents: 5947 },
    requests: [{ method: "list", failed: false }],
  },
  {
    name: "cheapest-available",
    instruction:
      "List the inventory. Return the complete item object for the cheapest item with positive stock.",
    expected: getItem({ id: "bolt" }),
    requests: [{ method: "list", failed: false }],
  },
  {
    name: "recover-missing",
    instruction:
      "First retrieve missing by id. If it does not exist, list the inventory, then retrieve bolt by id. Return the complete bolt item object.",
    expected: getItem({ id: "bolt" }),
    requests: [
      { method: "get", id: "missing", failed: true },
      { method: "list", failed: false },
      { method: "get", id: "bolt", failed: false },
    ],
  },
  {
    name: "report-missing",
    instruction:
      'Retrieve missing by id. If it does not exist, return {"found":false}. Do not substitute another item.',
    expected: { found: false },
    requests: [{ method: "get", id: "missing", failed: true }],
  },
] satisfies readonly Scenario[];
