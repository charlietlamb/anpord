import { defineEval, empty } from "anpord";
import { tasks, trials } from "./config";
import { catalogMcp } from "./mocks/catalog-mcp";
import { validateMcp } from "./validators/catalog";

export default defineEval({
  name: "anpord-ci/mcp",
  source: empty,
  mcp: [catalogMcp],
  prompt:
    "Use the local catalog MCP tools. First try to get item missing. If it does not exist, list the items and retrieve ci_fixture. Report its name. Do not install tools or contact external APIs.",
  cases: [{ name: "retrieve-item", validate: validateMcp }],
  tasks,
  trials,
});
