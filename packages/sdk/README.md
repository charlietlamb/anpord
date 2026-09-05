# anpord

TypeScript SDK for [Anpord](https://anpord.com). Run coding agent evals across harnesses, models, and sandboxes, and manage versioned prompts from the same client.

## Install

```sh
npm install anpord
```

## Run an eval

```ts
import { Anpord } from "anpord";

const anpord = new Anpord({ apiKey: process.env.ANPORD_API_KEY });

const run = await anpord.evals.startAndWait({
  cases: [
    {
      name: "writes the requested file",
      variables: { task: "Create hello.txt containing exactly hello" },
      verify: "test \"$(cat hello.txt)\" = hello",
    },
  ],
  prompt: "{{task}}",
  tasks: [{ harness: "codex", model: "gpt-5.6-sol", provider: "daytona" }],
  trials: 3,
});

for (const cell of run.cells) {
  console.log(cell.caseName, cell.distribution?.passRate);
}
```

For a TypeScript validator, export the function from its own file:

```ts
import type { Validator } from "anpord";

export const hasGreeting: Validator = async ({ readText }) =>
  (await readText("hello.txt")) === "hello";
```

Reference it directly from `greeting.eval.ts`:

```ts
import { defineEval } from "anpord";
import { hasGreeting } from "./validators/greeting";

export default defineEval({
  name: "greeting",
  cases: [
    {
      name: "greeting",
      variables: { task: "Write hello.txt" },
      validate: hasGreeting,
    },
  ],
  prompt: "{{task}}",
  tasks: [{ harness: "codex", model: "gpt-5.6-sol", provider: "daytona" }],
  trials: 3,
});
```

```sh
npx anpord eval
```

With no paths, the CLI discovers every `**/*.eval.ts` file and starts the
suites concurrently. Pass files or directories to run a smaller set.

## Mock MCP servers

Define local MCP dependencies once and Anpord gives every built-in agent trial
a fresh stdio server:

```ts
import { z } from "zod";
import { defineEval } from "anpord";
import { server, tool } from "anpord/mcp";

const api = server({
  name: "example",
  version: "1.0.0",
  tools: [
    tool({
      name: "users_get",
      inputSchema: z.object({ id: z.string() }),
      outputSchema: z.object({ id: z.string(), name: z.string() }),
      handler: ({ id }) => ({ id, name: "Ada" }),
    }),
  ],
});

export default defineEval({
  mcp: [api],
  // cases, prompt, tasks, and trials
});
```

Handlers return plain values or promises. Validators can inspect exact calls
with `await context.mcp.calls("example")`. No service credentials are needed.

## Resolve a prompt

```ts
const prompt = await anpord.prompts.get({ id: "support-reply" });
console.log(prompt.content, prompt.version);
```

See the [documentation](https://docs.anpord.com) for eval concepts, prompt releases, SDK methods, and the API reference.

## License

MIT
