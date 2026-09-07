import { server, tool } from "anpord/mcp";
import {
  getInput,
  getItem,
  itemSchema,
  listInput,
  listItems,
  listOutput,
} from "../fixtures/catalog";

export const catalogMcp = server({
  name: "inventory",
  version: "1.0.0",
  tools: [
    tool({
      name: "items_list",
      description:
        "List all inventory items, including stock and prices in cents.",
      inputSchema: listInput,
      outputSchema: listOutput,
      handler: listItems,
    }),
    tool({
      name: "items_get",
      description: "Get an inventory item by id.",
      inputSchema: getInput,
      outputSchema: itemSchema,
      handler: getItem,
    }),
  ],
});
