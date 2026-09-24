# anpord

TypeScript SDK and CLI for [Anpord](https://anpord.com). Define coding-agent evals, run them on different harnesses, models and sandboxes, and manage versioned prompts.

## Install

```sh
npm install anpord
```

## Define a suite

A suite groups cases that share a prompt and setup. Suites and cases need an `id`, a lowercase handle such as `writes-hello`; a `name` is optional and defaults to the id. Each variant is a harness, model and sandbox to run every case on, with an optional profile.

```ts
import { command, suite, empty } from "anpord";

export default suite({
  id: "greeting",
  source: empty,
  prompt: "{{task}}",
  cases: [
    {
      id: "writes-hello",
      variables: { task: "Create hello.txt containing exactly hello" },
      validate: command('test "$(cat hello.txt)" = hello'),
    },
  ],
  variants: [
    { harness: "codex", model: "gpt-5.6-sol" },
    { harness: "claude", model: "sonnet", sandbox: "daytona" },
    {
      harness: "opencode",
      model: "anthropic/claude-sonnet-4.6",
      profile: { dir: "./profiles/strict", name: "strict" },
    },
  ],
  trials: 3,
});
```

A case has one `validate`: a shell `command(...)` whose exit code decides the trial, a validator function, a model judge, or an array of validators and judges that must all pass. A command decides a case on its own and cannot go in an array.

```sh
npx anpord eval ./greeting.eval.ts
```

Each file starts a batch: one run per case per variant. Each run makes `trials` attempts, each in its own sandbox. With no file, the CLI finds every `*.eval.ts` file under the current directory.

## Mock MCP and CLI

Install Zod for the examples:

```sh
npm install zod
```

```ts
import { z } from "zod";
import { server, tool } from "anpord/mcp";

const User = z.object({ id: z.string(), name: z.string() });

export const usersMcp = server({
  name: "users",
  version: "1.0.0",
  tools: [
    tool({
      name: "users_get",
      inputSchema: z.object({ id: z.string() }),
      outputSchema: User,
      handler: ({ id }) => ({ id, name: "Ada" }),
    }),
  ],
});
```

```ts
import { z } from "zod";
import { cli, command } from "anpord/cli";

export const usersCli = cli({
  path: "users",
  version: "1.0.0",
  commands: [
    command({
      path: ["get"],
      inputSchema: z.object({ id: z.string() }),
      outputSchema: z.object({ id: z.string(), name: z.string() }),
      options: { id: { type: "string" } },
      handler: ({ id }) => ({ id, name: "Ada" }),
    }),
  ],
});
```

Attach them to a suite with `mcp: [usersMcp]` or `cli: [usersCli]`. Schemas type the handlers and validate calls at runtime. The `command` from `anpord/cli` declares a mock CLI command, unlike the `command` validator from `anpord`, so alias one of them in a file that imports both.

## Model judges

```ts
import { judge } from "anpord/validators";

const correctness = judge({
  name: "correctness",
  harness: "codex",
  model: "gpt-5.6-sol",
  prompt: "The answer matches the reference without inventing facts.",
  expected: "Ada",
  choices: { correct: 1, incorrect: 0 },
});
```

Set `validate: correctness` on a case, or combine it with code: `validate: [checkToolCalls, correctness]`. Every check must pass. A judge with `harness` uses that harness connection, including a ChatGPT sign-in for Codex. To call OpenAI directly, use `provider: "openai"` and add an OpenAI model connection.

See [model judges](https://docs.anpord.com/evals/judges) for isolation, authentication and unscored failures.

## Start a batch from code

```ts
import { Anpord } from "anpord";
import greeting from "./greeting.eval";

const anpord = new Anpord();
const batch = await anpord.evals.batches.startAndWait(greeting);

console.log(batch.status, batch.runs);
await anpord.dispose();
```

The client reads `ANPORD_API_KEY`. `batch.runs` holds one run per case and variant, each with its trials and pass rate. `evals.batches.start` returns as soon as the batch is started, and `evals.batches.wait({ id })` waits on one started earlier.

## Read and rerun from code

```ts
const { cases } = await anpord.evals.cases.list({ suite: "greeting" });
const detail = await anpord.evals.cases.get({ id: "writes-hello" });

const rerun = await anpord.evals.cases.run({
  id: "writes-hello",
  trials: 3,
  variants: detail.variants.map(({ variant }) => variant.id),
});

const { runs } = await anpord.evals.runs.list({ caseId: "writes-hello" });
const run = await anpord.evals.runs.get({ id: rerun.runs[0].id });
const models = await anpord.evals.models.list({ harness: "codex" });
```

`evals.batches`, `evals.cases`, `evals.runs` and `evals.models` follow the data model: a suite holds cases, a case runs on variants, and each run of a case on a variant holds its trials. A batch is the runs started together.

See the [documentation](https://docs.anpord.com) for cases, validators, profiles, mocks, prompt releases and the API reference.

## License

MIT
