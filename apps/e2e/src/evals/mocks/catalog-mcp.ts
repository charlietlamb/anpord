import { server, tool } from "anpord/mcp";
import {
  getItem,
  getItemInput,
  itemSchema,
  listItems,
  listItemsInput,
  listItemsOutput,
} from "../fixtures/catalog";

export const catalogMcp = server({
  name: "catalog",
  version: "1.0.0",
  tools: [
    tool({
      name: "items_list",
      description: "List catalog items.",
      inputSchema: listItemsInput,
      outputSchema: listItemsOutput,
      handler: listItems,
    }),
    tool({
      name: "items_get",
      description: "Get a catalog item by id.",
      inputSchema: getItemInput,
      outputSchema: itemSchema,
      handler: getItem,
    }),
  ],
});
