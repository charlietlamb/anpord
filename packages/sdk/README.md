# anpord

TypeScript SDK for [Anpord](https://anpord.com). Define coding-agent evals, run them across agents and sandboxes, and manage versioned prompts.

## Install

```sh
npm install anpord
```

## Define an eval

```ts
import { defineEval, empty } from "anpord";

export default defineEval({
  name: "greeting",
  source: empty,
  prompt: "{{task}}",
  cases: [
    {
      name: "writes hello",
      variables: { task: "Create hello.txt containing exactly hello" },
      verify: 'test "$(cat hello.txt)" = hello',
    },
  ],
  tasks: [{ harness: "codex", model: "model-id", provider: "daytona" }],
  trials: 3,
});
```

```sh
npx anpord eval ./greeting.eval.ts
```

With no file, the CLI discovers every `**/*.eval.ts` suite.

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

Attach definitions with `mcp: [usersMcp]` or `cli: [usersCli]`. Handlers use plain TypeScript. Schemas infer handler types and validate calls at runtime.

## Model judges

```ts
import { judge } from "anpord/validators";

const correctness = judge({
  name: "correctness",
  harness: "codex",
  model: "gpt-5.6-sol",
  rubric: "The answer matches the reference without inventing facts.",
  expected: "Ada",
  choices: { correct: 1, incorrect: 0 },
});
```

Set `validate: correctness`, or combine it with code: `validate: [checkToolCalls, correctness]`. Every check must pass. Judges use the organization's harness connection, including Codex subscriptions. For direct OpenAI calls, use `provider: "openai"` and configure an OpenAI key in the environment connection.

See [model judges](https://docs.anpord.com/evals/judges) for isolation, authentication, and unscored failures.

## Use the API

```ts
import { Anpord } from "anpord";
import { compileEval } from "anpord/eval";

const anpord = new Anpord();
const run = await anpord.evals.startAndWait(
  await compileEval("./greeting.eval.ts")
);

console.log(run.status, run.cells);
await anpord.dispose();
```

The client reads `ANPORD_API_KEY`.

See the [documentation](https://docs.anpord.com) for cases, validators, profiles, mock interfaces, prompt releases, and the API reference.

## License

MIT
