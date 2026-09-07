import { cli, command } from "anpord/cli";
import {
  getInput,
  getItem,
  itemSchema,
  listInput,
  listItems,
  listOutput,
} from "../fixtures/catalog";

export const catalogCli = cli({
  path: "inventory",
  version: "1.0.0",
  description: "A local inventory. Prices are in cents.",
  commands: [
    command({
      path: ["items", "list"],
      description: "List all inventory items.",
      inputSchema: listInput,
      outputSchema: listOutput,
      options: {},
      handler: listItems,
    }),
    command({
      path: ["items", "get"],
      description: "Get an inventory item by id.",
      inputSchema: getInput,
      outputSchema: itemSchema,
      options: { id: { type: "string" } },
      handler: getItem,
    }),
  ],
});
