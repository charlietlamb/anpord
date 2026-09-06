import { z } from "zod";

export const item = { id: "ci_fixture", name: "Anpord CI fixture" };
export const itemSchema = z.object({ id: z.string(), name: z.string() });
export const getItemInput = z.object({ id: z.string() });
export const listItemsInput = z.object({});
export const listItemsOutput = z.object({ items: z.array(itemSchema) });
export const listItems = () => ({ items: [item] });
export const getItem = ({ id }: z.infer<typeof getItemInput>) => {
  if (id !== item.id) {
    throw new Error(`Unknown item: ${id}`);
  }
  return item;
};
