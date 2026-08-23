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

const { id } = await anpord.evals.start({
  cases: [
    {
      goal: "Create hello.txt containing exactly hello",
      name: "writes the requested file",
      verify: "test \"$(cat hello.txt)\" = hello",
    },
  ],
  prompt: "{{goal}}",
  tasks: [
    { harness: "codex", model: "gpt-5.6-sol", provider: "daytona" },
  ],
  trials: 3,
});

console.log(id);
```

## Resolve a prompt

```ts
const prompt = await anpord.prompts.get({ id: "support-reply" });
console.log(prompt.content, prompt.version);
```

See the [documentation](https://docs.anpord.com) for eval concepts, prompt releases, SDK methods, and the API reference.

## License

MIT
