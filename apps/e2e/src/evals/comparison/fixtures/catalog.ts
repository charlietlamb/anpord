import { z } from "zod";

export const itemSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  priceCents: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative(),
});
export const getInput = z.strictObject({ id: z.string() });
export const listInput = z.strictObject({});
export const listOutput = z.strictObject({ items: z.array(itemSchema) });
export const answerSchema = z.union([
  itemSchema,
  z.strictObject({ ids: z.array(z.string()) }),
  z.strictObject({ totalValueCents: z.number().int() }),
  z.strictObject({ found: z.literal(false) }),
]);

export const items = [
  {
    id: "bolt",
    name: "Brass bolt",
    category: "hardware",
    priceCents: 125,
    stock: 8,
  },
  {
    id: "hammer",
    name: "Claw hammer",
    category: "hardware",
    priceCents: 2499,
    stock: 0,
  },
  {
    id: "tape",
    name: "Measuring tape",
    category: "hardware",
    priceCents: 899,
    stock: 3,
  },
  {
    id: "notebook",
    name: "Field notebook",
    category: "stationery",
    priceCents: 450,
    stock: 5,
  },
] satisfies z.infer<typeof itemSchema>[];

export const listItems = () => ({ items });
export const getItem = ({ id }: z.infer<typeof getInput>) => {
  const item = items.find((entry) => entry.id === id);
  if (!item) {
    throw new Error(`Unknown item: ${id}`);
  }
  return item;
};
