import type { ValidatorContext } from "anpord";
import type { RequestEvidence } from "../scenarios";
import type { Transport } from "../validators/catalog";

export const journals = (requests: readonly RequestEvidence[]) => ({
  mcp: requests.map(({ method, id, failed }) => ({
    server: "inventory",
    kind: "tool" as const,
    name: `items_${method}`,
    input: id === undefined ? {} : { id },
    ...(failed ? { error: `Unknown item: ${id}` } : {}),
  })),
  cli: requests.map(({ method, id, failed }) => ({
    cli: "inventory",
    command: `items ${method}`,
    input: id === undefined ? {} : { id },
    ...(failed ? { error: `Unknown item: ${id}` } : {}),
  })),
  api: requests.map(({ method, id, failed }, index) => ({
    api: "inventory",
    index,
    method: "GET",
    path: method === "list" ? "/items" : `/items/${id}`,
    matched: true,
    status: failed ? 404 : 200,
    error: null,
    startedAt: 1000,
    durationMs: 1,
    logs: [],
    input: {
      state: "unavailable" as const,
      text: "",
      format: "json" as const,
      truncated: false,
    },
    output: {
      state: "unavailable" as const,
      text: "",
      format: "json" as const,
      truncated: false,
    },
  })),
});

export const evidenceContext = (
  transport: Transport,
  requests: readonly RequestEvidence[],
  answer: string
): ValidatorContext => {
  const calls = journals(requests);
  return {
    answer: async () => answer,
    transcript: async () => answer,
    mcp: { calls: async () => (transport === "mcp" ? calls.mcp : []) },
    cli: { calls: async () => (transport === "cli" ? calls.cli : []) },
    api: {
      calls: async () => (transport === "api" ? calls.api : []),
      url: async () => "http://127.0.0.1",
    },
    prepared: {},
    exec: () => {
      throw new Error("Unexpected shell execution");
    },
    exists: async () => false,
    readText: () => {
      throw new Error("Unexpected file read");
    },
  };
};
