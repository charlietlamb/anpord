import {
  ChannelName,
  PromptId,
  VersionNumber,
} from "@anpord/schema/domain/prompts";
import { AnpordApi } from "@anpord/schema/public/client";
import { extractVariables } from "@anpord/template/extract";
import { Args, Command, Options } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Effect, Option } from "effect";
import { compileEvalEffect } from "../evals/compiler";
import { declarationFile } from "./declarations";
import { evalFilesIn } from "./eval-files";
import { failWhen, NoEvalFiles, problemsWith } from "./eval-gate";
import { liveGrid, summaryOf } from "./eval-grid";
import { waitForRun } from "./eval-run";
import { attended, json, note, promptContent, row } from "./render";

const promptId = Args.text({ name: "id" }).pipe(
  Args.withDescription("The prompt's id, such as support-reply"),
  Args.withSchema(PromptId)
);

const channel = Options.text("channel").pipe(
  Options.withDescription("Resolve the version a channel points at"),
  Options.withSchema(ChannelName),
  Options.optional
);

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
    return yield* Effect.forEach(data, (summary) =>
      row(`${summary.id}\tv${summary.latestVersion ?? "-"}\t${summary.name}`)
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

/**
 * Read from the stream rather than by opening `/dev/stdin` as a file. The path
 * only names the pipe, so reading it races whoever is writing: a body arriving
 * in more than one chunk, which is what a pipe does under load, was read as
 * whatever had landed by then.
 */
const readStdin = Effect.async<string, Error>((resume) => {
  let body = "";

  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    body += chunk;
  });
  process.stdin.on("end", () => resume(Effect.succeed(body)));
  process.stdin.on("error", (cause) =>
    resume(
      Effect.fail(new Error("Could not read the content from stdin", { cause }))
    )
  );
});

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

const out = Options.file("out").pipe(
  Options.withDescription("Where to write the declarations"),
  Options.withDefault("anpord-env.d.ts")
);

/** Reading one prompt at a time because the list carries no content, bounded
 * so a large organisation does not open a connection per prompt. */
const READ_AT_ONCE = 8;

const writeDeclarations = ({ out: path }: { readonly out: string }) =>
  Effect.gen(function* () {
    const api = yield* AnpordApi;
    const fs = yield* FileSystem.FileSystem;
    const { data } = yield* api.prompts.list({ payload: {} });

    const prompts = yield* Effect.forEach(
      data,
      (summary) =>
        api.prompts
          .get({ payload: { id: summary.id } })
          .pipe(
            Effect.map(
              (prompt) => [prompt.id, extractVariables(prompt.content)] as const
            )
          ),
      { concurrency: READ_AT_ONCE }
    );

    yield* fs.writeFileString(path, declarationFile(prompts));

    return yield* note(
      `Wrote ${prompts.length} ${prompts.length === 1 ? "prompt" : "prompts"} to ${path}`
    );
  });

const DESCRIPTION = "Write TypeScript declarations for prompt variables";

const generate = Command.make("generate", { out }, writeDeclarations).pipe(
  Command.withDescription(DESCRIPTION)
);

/** A second command rather than an alias, because a command carries one name
 * and the shorter one is what anybody types twice. */
const gen = Command.make("gen", { out }, writeDeclarations).pipe(
  Command.withDescription(DESCRIPTION)
);

const evalFile = Args.text({ name: "file" }).pipe(
  Args.withDescription(
    "A TypeScript file that default exports defineEval(...); every *.eval.ts is run when omitted"
  ),
  Args.optional
);

const noWait = Options.boolean("no-wait").pipe(
  Options.withDescription("Start the run and print its id, without waiting")
);

const failOn = Options.choice("fail-on", [
  "never",
  "regressed",
  "unscored",
]).pipe(
  Options.withDescription("What makes the command exit nonzero"),
  Options.withDefault("regressed" as const)
);

const runOneEval = (
  file: string,
  options: {
    readonly gate: "never" | "regressed" | "unscored";
    readonly label: boolean;
    readonly skipWait: boolean;
    readonly wantsJson: boolean;
  }
) =>
  Effect.gen(function* () {
    const api = yield* AnpordApi;
    const payload = yield* compileEvalEffect(file);
    const started = yield* api.evals.start({ payload });

    if (options.skipWait) {
      yield* json(started);
      return [] as readonly string[];
    }

    const live = !options.wantsJson && (yield* attended);

    if (live || options.label) {
      yield* note(`${file} · run ${started.id}`);
    }

    const draw = yield* liveGrid(payload.trials, live);
    const run = yield* waitForRun(started.id, draw);

    yield* options.wantsJson
      ? json(run)
      : note(summaryOf(run, payload.trials, live));

    return problemsWith(run, options.gate);
  });

const runEval = Command.make(
  "eval",
  { asJson, evalFile, failOn, noWait },
  ({ asJson: wantsJson, evalFile: file, failOn: gate, noWait: skipWait }) =>
    Effect.gen(function* () {
      const files = yield* Option.match(file, {
        onNone: () => evalFilesIn("."),
        onSome: (one) => Effect.succeed([one] as readonly string[]),
      });

      if (files.length === 0) {
        return yield* Effect.fail(new NoEvalFiles({ directory: "." }));
      }

      const found = yield* Effect.forEach(files, (one) =>
        runOneEval(one, {
          gate,
          label: files.length > 1,
          skipWait,
          wantsJson,
        })
      );

      return yield* failWhen(found.flat());
    })
).pipe(Command.withDescription("Compile and run an eval from TypeScript"));

export const commands = [
  runEval,
  gen,
  generate,
  get,
  list,
  promote,
  push,
  versions,
] as const;
