import { api, endpoint } from "anpord/api";
import { z } from "zod";
import {
  getItemInput,
  item,
  itemSchema,
  listItems,
  listItemsOutput,
} from "../fixtures/catalog";

export const catalogApi = api({
  name: "catalog",
  endpoints: [
    endpoint({
      method: "GET",
      path: "/items",
      inputSchema: z.object({}),
      responses: { 200: listItemsOutput },
      handler: () => ({ status: 200, body: listItems() }),
    }),
    endpoint({
      method: "GET",
      path: "/items/:id",
      inputSchema: z.object({ params: getItemInput }),
      responses: { 200: itemSchema, 404: z.object({ message: z.string() }) },
      handler: ({ params }) =>
        params.id === item.id
          ? { status: 200, body: item }
          : { status: 404, body: { message: `Unknown item: ${params.id}` } },
    }),
  ],
});
