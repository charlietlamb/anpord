import { describe, expect, it } from "bun:test";
import type { ExecStreamChunk } from "@upstash/box";
import { Effect, Stream } from "effect";
import { envFileFor, sourcing } from "../../../src/adapters/sandbox/env-file";
import { handleFor } from "../../../src/adapters/sandbox/upstash";

const SECRET = "sk-ant-not-a-real-key-0123456789";

interface Written {
  readonly content: string;
  readonly path: string;
}

interface Recorded {
  readonly commands: string[];
  readonly written: Written[];
}

/* Enough of an Upstash box for the real handle to run a command through it,
   so the assertion is over the command the adapter actually sends rather
   than over a mock's recorded calls. */
const fakeBox = (seen: Recorded) => ({
  delete: () => Promise.resolve(undefined),
  exec: {
    stream: (command: string) => {
      seen.commands.push(command);

      const chunks: ExecStreamChunk[] = [
        { data: "ok", type: "output" },
        { cpuNs: 0, exitCode: 0, type: "exit" },
      ];

      return Promise.resolve({
        [Symbol.asyncIterator]: () => {
          const remaining = [...chunks];

          return {
            next: () => {
              const value = remaining.shift();

              return Promise.resolve(
                value === undefined
                  ? { done: true as const, value: undefined }
                  : { done: false as const, value }
              );
            },
          };
        },
        cancel: () => Promise.resolve(),
        status: "finished",
      });
    },
  },
  files: {
    write: (file: Written) => {
      seen.written.push(file);
      return Promise.resolve(undefined);
    },
  },
  id: "box-1",
});

const execWith = (env: Readonly<Record<string, string>> | undefined) =>
  Effect.gen(function* () {
    const seen: Recorded = { commands: [], written: [] };
    const handle = handleFor(fakeBox(seen), "/tmp/anpord");

    yield* Stream.runDrain(handle.exec("npm test", { env }));

    return seen;
  });

describe("a sandbox never carries a credential in a command string", () => {
  it("puts no env value in the command, and sources a file instead", async () => {
    const file = await Effect.runPromise(
      envFileFor({ ANTHROPIC_API_KEY: SECRET })
    );

    expect(file).not.toBeNull();
    expect(file?.contents).toContain(SECRET);

    const command = sourcing(file, "npm test");

    expect(command).not.toContain(SECRET);
    expect(command).toContain("chmod 600");
    expect(command).toContain("rm -f");
    expect(command).toContain("npm test");
  });

  it("drops a name that is not a shell identifier", async () => {
    const file = await Effect.runPromise(
      envFileFor({ "not-an-identifier": SECRET, OK_NAME: "fine" })
    );

    expect(file?.contents).toContain("OK_NAME");
    expect(file?.contents).not.toContain("not-an-identifier");
    expect(file?.contents).not.toContain(SECRET);
  });

  it("writes nothing when there is no environment to carry", async () => {
    expect(await Effect.runPromise(envFileFor(undefined))).toBeNull();
    expect(await Effect.runPromise(envFileFor({}))).toBeNull();
    expect(sourcing(null, "npm test")).toBe("npm test");
  });

  /* The defect this exists to catch: the values used to be spliced into the
     command, which every provider retains. */
  it("keeps the secret out of every command upstash is given", async () => {
    const seen = await Effect.runPromise(
      execWith({ ANTHROPIC_API_KEY: SECRET })
    );

    expect(seen.commands).toHaveLength(1);
    for (const command of seen.commands) {
      expect(command).not.toContain(SECRET);
    }

    expect(seen.written).toHaveLength(1);
    expect(seen.written[0]?.content).toContain(SECRET);
    expect(seen.commands[0]).toContain(seen.written[0]?.path ?? "");
  });

  it("runs the command unchanged when it carries no environment", async () => {
    const seen = await Effect.runPromise(execWith(undefined));

    expect(seen.written).toHaveLength(0);
    expect(seen.commands[0]).toContain("npm test");
  });
});
