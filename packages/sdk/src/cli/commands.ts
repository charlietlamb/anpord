import { ChannelName, PromptId, VersionNumber } from "@anpord/schema/prompts";
import { Args, Command, Options } from "@effect/cli";
import { Data, Effect, Option } from "effect";
import { AnpordApi } from "../client";
import { json, note, promptContent } from "./render";

const promptId = Args.text({ name: "id" }).pipe(
  Args.withDescription("The prompt's id, such as support-reply"),
  Args.withSchema(PromptId)
);

const channel = Options.text("channel").pipe(
  Options.withDescription("Resolve the version a channel points at"),
  Options.withSchema(ChannelName),
  Options.optional
);

/** Not --version: that is the CLI's own flag and wins before the command runs. */
const version = Options.integer("at").pipe(
  Options.withDescription("Pin an exact version"),
  Options.withSchema(VersionNumber),
  Options.optional
);

const asJson = Options.boolean("json").pipe(
  Options.withDescription("Print the whole prompt as JSON")
);

const message = Options.text("message").pipe(
  Options.withAlias("m"),
  Options.withDescription("Why the content changed"),
  Options.optional
);

const get = Command.make(
  "get",
  { asJson, channel, promptId, version },
  ({ asJson: wantsJson, channel: wantedChannel, promptId: id, version: pin }) =>
    Effect.gen(function* () {
      const api = yield* AnpordApi;
      const prompt = yield* api.prompts.get({
        payload: {
          channel: Option.getOrUndefined(wantedChannel),
          id,
          version: Option.getOrUndefined(pin),
        },
      });
      return yield* wantsJson ? json(prompt) : promptContent(prompt);
    })
).pipe(Command.withDescription("Print a prompt's content"));

const list = Command.make("list", { asJson }, ({ asJson: wantsJson }) =>
  Effect.gen(function* () {
    const api = yield* AnpordApi;
    const { data } = yield* api.prompts.list({ payload: {} });

    if (wantsJson) {
      return yield* json(data);
    }
    return yield* Effect.forEach(data, (row) =>
      note(`${row.id}\tv${row.latestVersion ?? "-"}\t${row.name}`)
    );
  })
).pipe(Command.withDescription("List every prompt"));

const versions = Command.make("versions", { promptId }, ({ promptId: id }) =>
  Effect.gen(function* () {
    const api = yield* AnpordApi;
    const prompt = yield* api.prompts.get({
      payload: { id, includeVersions: true },
    });
    return yield* json(prompt.versions ?? []);
  })
).pipe(Command.withDescription("Show a prompt's history"));

const promote = Command.make(
  "promote",
  {
    channel: Options.text("to").pipe(
      Options.withDescription("Channel to point at the version"),
      Options.withSchema(ChannelName)
    ),
    promptId,
    version: Options.integer("at").pipe(
      Options.withDescription("Version to promote"),
      Options.withSchema(VersionNumber)
    ),
  },
  ({ channel: to, promptId: id, version: pin }) =>
    Effect.gen(function* () {
      const api = yield* AnpordApi;
      yield* api.prompts.promote({
        payload: { channel: to, id, version: pin },
      });
      return yield* note(`${id} v${pin} is now ${to}`);
    })
).pipe(Command.withDescription("Point a channel at a version"));

class StdinUnreadable extends Data.TaggedError("StdinUnreadable")<{
  readonly cause: unknown;
}> {}

/** A closed pipe fails the read, so it is a typed error rather than a defect. */
const readStdin = Effect.tryPromise({
  catch: (cause) => new StdinUnreadable({ cause }),
  try: () => Bun.stdin.text(),
});

/** A tuple fixes the order; separate keys are sorted by name, not by position. */
const target = Args.all([
  promptId,
  Args.text({ name: "content" }).pipe(
    Args.withDescription("The new content, or - to read stdin")
  ),
]);

const push = Command.make(
  "push",
  { message, target },
  ({ message: why, target: [id, content] }) =>
    Effect.gen(function* () {
      const api = yield* AnpordApi;
      const body = content === "-" ? yield* readStdin : content;

      const prompt = yield* api.prompts.update({
        payload: {
          content: body,
          id,
          message: Option.getOrUndefined(why),
        },
      });
      return yield* note(`${id} is now v${prompt.version}`);
    })
).pipe(Command.withDescription("Add a version to a prompt"));

export const commands = [get, list, promote, push, versions] as const;
