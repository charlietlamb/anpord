import { cli, command } from "anpord/cli";
import {
  getItem,
  getItemInput,
  itemSchema,
  listItems,
  listItemsInput,
  listItemsOutput,
} from "../fixtures/catalog";

export const catalogCli = cli({
  path: "catalog",
  version: "1.0.0",
  description: "A local fixture catalog.",
  commands: [
    command({
      path: ["items", "list"],
      description: "List catalog items.",
      inputSchema: listItemsInput,
      outputSchema: listItemsOutput,
      options: {},
      handler: listItems,
    }),
    command({
      path: ["items", "get"],
      description: "Get a catalog item by id.",
      inputSchema: getItemInput,
      outputSchema: itemSchema,
      options: { id: { type: "string" } },
      handler: getItem,
    }),
  ],
});
