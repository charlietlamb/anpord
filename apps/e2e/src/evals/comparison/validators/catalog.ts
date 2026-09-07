import { isDeepStrictEqual } from "node:util";
import type { Validator, ValidatorContext } from "anpord";
import { answerSchema, getInput } from "../fixtures/catalog";
import type { RequestEvidence, Scenario } from "../scenarios";

export const transports = ["mcp", "cli", "api"] as const;
export type Transport = (typeof transports)[number];

const requests: Record<
  Transport,
  (context: ValidatorContext) => Promise<readonly RequestEvidence[]>
> = {
  mcp: async ({ mcp }) =>
    (await mcp.calls("inventory")).flatMap<RequestEvidence>((call) => {
      if (call.kind !== "tool") {
        return [];
      }
      if (call.name === "items_list") {
        return [{ method: "list", failed: call.error !== undefined }];
      }
      const input = getInput.safeParse(call.input);
      if (
        input.success &&
        call.error !== undefined &&
        call.error !== `Unknown item: ${input.data.id}`
      ) {
        return [];
      }
      return call.name === "items_get" && input.success
        ? [
            {
              method: "get",
              id: input.data.id,
              failed: call.error !== undefined,
            },
          ]
        : [];
    }),
  cli: async ({ cli }) =>
    (await cli.calls("inventory")).flatMap<RequestEvidence>((call) => {
      if (call.command === "items list") {
        return [{ method: "list", failed: call.error !== undefined }];
      }
      const input = getInput.safeParse(call.input);
      if (
        input.success &&
        call.error !== undefined &&
        call.error !== `Unknown item: ${input.data.id}`
      ) {
        return [];
      }
      return call.command === "items get" && input.success
        ? [
            {
              method: "get",
              id: input.data.id,
              failed: call.error !== undefined,
            },
          ]
        : [];
    }),
  api: async ({ api }) =>
    (await api.calls("inventory")).flatMap<RequestEvidence>((call) => {
      if (
        !call.matched ||
        call.method !== "GET" ||
        ![200, 404].includes(call.status) ||
        call.error !== null
      ) {
        return [];
      }
      if (call.path === "/items") {
        return [
          {
            method: "list",
            failed: call.status !== 200,
          },
        ];
      }
      return [
        {
          method: "get",
          id: call.path.slice("/items/".length),
          failed: call.status !== 200,
        },
      ];
    }),
};

export const validateCatalog = (
  transport: Transport,
  scenario: Scenario
): Validator =>
  async function validateInventory(context) {
    const evidence = await requests[transport](context);
    let offset = 0;
    for (const required of scenario.requests) {
      const index = evidence.findIndex(
        (call, position) =>
          position >= offset && isDeepStrictEqual(call, required)
      );
      if (index < 0) {
        return {
          passed: false,
          message: `Missing ordered request: ${JSON.stringify(required)}`,
        };
      }
      offset = index + 1;
    }
    for (const other of transports.filter((value) => value !== transport)) {
      if ((await context[other].calls("inventory")).length > 0) {
        return {
          passed: false,
          message: `Used ${other} instead of only ${transport}.`,
        };
      }
    }
    const answer = await context.answer();
    try {
      const parsed = answerSchema.safeParse(JSON.parse(answer));
      const passed =
        parsed.success && isDeepStrictEqual(parsed.data, scenario.expected);
      return {
        passed,
        message: passed
          ? "Recorded requests and exact JSON answer match."
          : `Expected ${JSON.stringify(scenario.expected)}; received ${answer}`,
      };
    } catch {
      return {
        passed: false,
        message:
          "The final answer must be valid JSON, without prose or markdown fences.",
      };
    }
  };
