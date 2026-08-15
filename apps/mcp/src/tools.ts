import {
  GetPromptRequest,
  PromotePromptRequest,
  UpdatePromptRequest,
} from "@anpord/schema/public/requests";
import { AnpordApi } from "anpord/client";
import { Effect, Schema } from "effect";
import type { MCPServer } from "mcp-use";
import { z } from "zod";
import { runAs } from "./runtime";

export interface AnpordUser {
  readonly email?: string;
  readonly id: string;
  readonly name?: string;
  readonly roles: string[];
}

const text = (value: string) => ({
  content: [{ text: value, type: "text" as const }],
});

const asJson = (value: unknown) => text(JSON.stringify(value, null, 2));

const promptId = z.string().describe("The prompt's id, such as support-reply");

export const register = (server: MCPServer<AnpordUser>) => {
  server.tool(
    {
      description:
        "Read a prompt's content. Returns the production version unless a " +
        "channel or version is given.",
      inputSchema: z.object({
        channel: z
          .string()
          .optional()
          .describe("Resolve the version this channel points at"),
        id: promptId,
        version: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Pin an exact version"),
      }),
      name: "get_prompt",
    },
    (input, ctx) =>
      runAs(
        ctx.auth.accessToken,
        Effect.gen(function* () {
          const api = yield* AnpordApi;
          const payload = yield* Schema.decodeUnknown(GetPromptRequest)(input);
          const prompt = yield* api.prompts.get({ payload });
          return text(prompt.content);
        })
      )
  );

  server.tool(
    {
      description: "List every prompt you can see, without content.",
      inputSchema: z.object({}),
      name: "list_prompts",
    },
    (_input, ctx) =>
      runAs(
        ctx.auth.accessToken,
        Effect.gen(function* () {
          const api = yield* AnpordApi;
          const { data } = yield* api.prompts.list({ payload: {} });
          return asJson(data);
        })
      )
  );

  server.tool(
    {
      description:
        "Show a prompt's version history: what changed, when, and why.",
      inputSchema: z.object({ id: promptId }),
      name: "list_versions",
    },
    (input, ctx) =>
      runAs(
        ctx.auth.accessToken,
        Effect.gen(function* () {
          const api = yield* AnpordApi;
          const { id } = yield* Schema.decodeUnknown(GetPromptRequest)(input);
          const prompt = yield* api.prompts.get({
            payload: { id, includeVersions: true },
          });
          return asJson(prompt.versions ?? []);
        })
      )
  );

  server.tool(
    {
      description:
        "Add a version to a prompt. Content is versioned, so this appends " +
        "rather than overwriting and earlier versions stay readable.",
      inputSchema: z.object({
        content: z.string().min(1).describe("The new content"),
        id: promptId,
        message: z.string().optional().describe("Why the content changed"),
      }),
      name: "update_prompt",
    },
    (input, ctx) =>
      runAs(
        ctx.auth.accessToken,
        Effect.gen(function* () {
          const api = yield* AnpordApi;
          const payload =
            yield* Schema.decodeUnknown(UpdatePromptRequest)(input);
          const prompt = yield* api.prompts.update({ payload });
          return text(`${payload.id} is now v${prompt.version}`);
        })
      )
  );

  server.tool(
    {
      description:
        "Point a channel at a version. This is how a version goes live " +
        "without callers changing anything.",
      inputSchema: z.object({
        channel: z.string().describe("Channel to move, such as production"),
        id: promptId,
        version: z.number().int().positive().describe("Version to promote"),
      }),
      name: "promote_prompt",
    },
    (input, ctx) =>
      runAs(
        ctx.auth.accessToken,
        Effect.gen(function* () {
          const api = yield* AnpordApi;
          const payload =
            yield* Schema.decodeUnknown(PromotePromptRequest)(input);
          yield* api.prompts.promote({ payload });
          return text(
            `${payload.id} v${payload.version} is now ${payload.channel}`
          );
        })
      )
  );
};
