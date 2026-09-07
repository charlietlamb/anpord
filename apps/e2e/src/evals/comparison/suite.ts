import { defineEval, type EvalTaskDefinition, empty } from "anpord";
import { catalogApi } from "./mocks/api";
import { catalogCli } from "./mocks/cli";
import { catalogMcp } from "./mocks/mcp";
import { scenarios } from "./scenarios";
import { transports, validateCatalog } from "./validators/catalog";

const instructions = {
  mcp: "Use only the configured inventory MCP tools for inventory data.",
  cli: "Use only the installed inventory CLI for inventory data. Discover commands with --help.",
  api: "Use only the local inventory HTTP API for inventory data. GET /items lists items; GET /items/:id retrieves one.",
};

export const comparisonSuite = (
  name: string,
  tasks: readonly EvalTaskDefinition[]
) =>
  defineEval({
    name: `anpord-models/${name}`,
    source: empty,
    mcp: [catalogMcp],
    cli: [catalogCli],
    api: [catalogApi],
    prompt:
      "{{transport}}\n\n{{instruction}}\n\nReturn only JSON. Do not install tools, inspect mock implementation files, or contact external APIs.",
    cases: transports.flatMap((transport) =>
      scenarios.map((scenario) => ({
        name: `${transport}/${scenario.name}`,
        variables: {
          transport: instructions[transport],
          instruction: scenario.instruction,
        },
        validate: validateCatalog(transport, scenario),
      }))
    ),
    tasks,
    trials: 1,
  });
