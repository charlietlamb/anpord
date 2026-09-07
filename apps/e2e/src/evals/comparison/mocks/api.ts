import { api, endpoint } from "anpord/api";
import { z } from "zod";
import {
  getInput,
  itemSchema,
  items,
  listItems,
  listOutput,
} from "../fixtures/catalog";

export const catalogApi = api({
  name: "inventory",
  endpoints: [
    endpoint({
      method: "GET",
      path: "/items",
      inputSchema: z.object({}),
      responses: { 200: listOutput },
      handler: () => ({ status: 200, body: listItems() }),
    }),
    endpoint({
      method: "GET",
      path: "/items/:id",
      inputSchema: z.object({ params: getInput }),
      responses: {
        200: itemSchema,
        404: z.strictObject({ message: z.string() }),
      },
      handler: ({ params }) => {
        const item = items.find(({ id }) => id === params.id);
        return item
          ? { status: 200, body: item }
          : { status: 404, body: { message: `Unknown item: ${params.id}` } };
      },
    }),
  ],
});
