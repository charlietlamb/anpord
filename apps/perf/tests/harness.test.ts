import { afterEach, describe, expect, test } from "bun:test";
import { mapLimit } from "../src/concurrency";
import { thresholdOf } from "../src/report/compare";
import { installFakeJudge, withFakeJudge } from "../src/runner/fake-judge";
import { tokensOf } from "../src/runner/recorded-batch";
import { trialUsage } from "../src/seed/journal";
import { seeded } from "../src/seed/random";
import { ENDPOINTS, selectEndpoints } from "../src/server/endpoints";
import { drive } from "../src/server/load";
import { sampleMemory, stopSamplers } from "../src/server/memory";
import { teardownAll } from "../src/stack/paired";
import { scratchServerUrl } from "../src/stack/scratch-database";

const sleep = (millis: number) =>
  new Promise((resolve) => setTimeout(resolve, millis));

describe("mapLimit", () => {
  test("rejects a limit that would start no workers", async () => {
    await expect(mapLimit([1, 2], 0, async (item) => item)).rejects.toThrow(
      "mapLimit needs a positive whole number limit, not 0."
    );
    await expect(mapLimit([1, 2], 0.5, async (item) => item)).rejects.toThrow(
      "mapLimit needs a positive whole number limit, not 0.5."
    );
  });

  test("stops scheduling after a failure and waits for running work", async () => {
    const started: number[] = [];
    const finished: number[] = [];
    const outcome = await mapLimit([1, 2, 3, 4, 5], 2, async (item) => {
      started.push(item);
      if (item === 1) {
        await sleep(5);
        throw new Error("item 1 failed");
      }
      await sleep(30);
      finished.push(item);
      return item;
    }).catch((error: Error) => error.message);
    expect(outcome).toBe("item 1 failed");
    expect(started).toEqual([1, 2]);
    expect(finished).toEqual([2]);
  });
});

describe("seed", () => {
  test("pick refuses an empty list", () => {
    expect(() => seeded(1).pick([])).toThrow("pick needs at least one item.");
  });

  test("trial usage totals every token it reports", () => {
    const usage = trialUsage(seeded(7));
    expect(usage.totalTokens).toBe(
      usage.inputTokens +
        usage.outputTokens +
        usage.cacheReadTokens +
        usage.cacheWriteTokens
    );
  });
});

describe("thresholdOf", () => {
  test("defaults, parses and rejects", () => {
    expect(thresholdOf(undefined, 5)).toBe(5);
    expect(thresholdOf("2.5", 5)).toBe(2.5);
    expect(() => thresholdOf("nope", 5)).toThrow(
      "--threshold must be a percentage of 0 or more, not nope."
    );
    expect(() => thresholdOf("-1", 5)).toThrow(
      "--threshold must be a percentage of 0 or more, not -1."
    );
  });
});

describe("endpoints", () => {
  test("an unknown --only name fails instead of measuring nothing", () => {
    expect(() => selectEndpoints(["runs.get", "runs.gte"])).toThrow(
      "No endpoint called runs.gte."
    );
    expect(selectEndpoints(["runs.get"]).map((each) => each.name)).toEqual([
      "runs.get",
    ]);
    expect(selectEndpoints(null)).toBe(ENDPOINTS);
  });

  test("runner.report keeps a quick budget and caps a full one at its slots", () => {
    const report = ENDPOINTS.find((each) => each.name === "runner.report");
    expect(
      report?.budget?.({ requests: 90, sequential: 15, warmup: 5 })
    ).toEqual({ requests: 90, sequential: 15, warmup: 5 });
    expect(
      report?.budget?.({ requests: 300, sequential: 50, warmup: 20 })
    ).toEqual({ requests: 270, sequential: 20, warmup: 10 });
  });
});

describe("drive", () => {
  test("a failed settle is recorded as a failed request", async () => {
    const server = Bun.serve({ fetch: () => new Response("{}"), port: 0 });
    try {
      const result = await drive(
        {
          requests: () => ({ auth: "key", method: "GET", path: "/" }),
          settle: () => Promise.reject(new Error("finish refused")),
        },
        {
          apiKey: "key",
          baseUrl: `http://127.0.0.1:${server.port}`,
          cookie: "",
        },
        0,
        2,
        1
      );
      expect(
        result.samples.map((sample) => [sample.ok, sample.failure])
      ).toEqual([
        [false, "settle: finish refused"],
        [false, "settle: finish refused"],
      ]);
    } finally {
      server.stop(true);
    }
  });
});

describe("sampleMemory", () => {
  test("a probe that fails makes the peak unreadable instead of zero", async () => {
    const stop = sampleMemory(() => Promise.reject(new Error("probe down")));
    await sleep(5);
    await expect(stop()).rejects.toThrow(
      "Could not read server memory: probe down"
    );
  });
});

describe("teardownAll", () => {
  test("tears down every stack even when one fails", async () => {
    const tornDown: string[] = [];
    const outcome = await teardownAll([
      { teardown: () => Promise.reject(new Error("first failed")) },
      {
        teardown: () => {
          tornDown.push("second");
          return Promise.resolve();
        },
      },
    ]).catch((error: Error) => error.message);
    expect(outcome).toBe("first failed");
    expect(tornDown).toEqual(["second"]);
  });
});

describe("stopSamplers", () => {
  test("stops every sampler before reporting the first failure", async () => {
    let healthyProbes = 0;
    const failing = sampleMemory(() => Promise.reject(new Error("probe down")));
    const healthy = sampleMemory(() => {
      healthyProbes += 1;
      return Promise.resolve({ heapUsed: 1, rss: 2 });
    });
    await expect(stopSamplers([failing, healthy])).rejects.toThrow(
      "Could not read server memory: probe down"
    );
    const afterStop = healthyProbes;
    await sleep(250);
    expect(healthyProbes).toBe(afterStop);
  });
});

describe("scratchServerUrl", () => {
  test("accepts quoted and IPv6 loopback URLs and refuses remote hosts", () => {
    expect(
      scratchServerUrl('"postgresql://localhost:5432/anpord_dev"').hostname
    ).toBe("localhost");
    expect(scratchServerUrl("postgresql://[::1]:5432/postgres").hostname).toBe(
      "[::1]"
    );
    expect(
      scratchServerUrl("postgresql://0.0.0.0:5432/postgres").hostname
    ).toBe("0.0.0.0");
    expect(() =>
      scratchServerUrl("postgresql://prod-db:5432/localhost")
    ).toThrow(
      "The perf harness only creates scratch databases on a local Postgres, not prod-db."
    );
  });
});

describe("fake judge", () => {
  const original = process.env.OPENAI_API_KEY;
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    if (original === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = original;
    }
  });

  test("answers the judge and restores the key it replaced", async () => {
    process.env.OPENAI_API_KEY = "operator-key";
    const judge = installFakeJudge();
    const response = await fetch("https://api.openai.com/v1/responses", {
      body: JSON.stringify({}),
      method: "POST",
    });
    const body = (await response.json()) as { model: string };
    judge.restore();
    expect(body.model).toBe("perf-fake-judge");
    expect(judge.calls()).toBe(1);
    expect(process.env.OPENAI_API_KEY).toBe("operator-key");
  });

  test("restores fetch and the key when the body throws", async () => {
    process.env.OPENAI_API_KEY = "operator-key";
    await expect(
      withFakeJudge(() => Promise.reject(new Error("boot failed")))
    ).rejects.toThrow("boot failed");
    expect(globalThis.fetch).toBe(realFetch);
    expect(process.env.OPENAI_API_KEY).toBe("operator-key");
  });

  test("removes the key when there was none", () => {
    delete process.env.OPENAI_API_KEY;
    installFakeJudge().restore();
    expect(process.env.OPENAI_API_KEY).toBeUndefined();
  });
});

describe("tokensOf", () => {
  const events = [
    {
      _tag: "Message" as const,
      at: 1,
      role: "assistant" as const,
      text: "hi",
      usage: {
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        inputTokens: 1200,
        outputTokens: 80,
        totalTokens: 1280,
      },
    },
  ];
  const scored = {
    commands: 0,
    durationMs: 1,
    events,
    kind: "scored" as const,
    outcome: {} as never,
    sandboxId: "sandbox",
    userSpend: null,
  };

  test("prefers the usage the harness reported for the trial", () => {
    expect(
      tokensOf({
        ...scored,
        usage: {
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          inputTokens: 400,
          outputTokens: 100,
          totalTokens: 500,
        },
      })
    ).toBe(500);
  });

  test("falls back to message usage when the trial has none", () => {
    expect(tokensOf({ ...scored, usage: null })).toBe(1280);
  });
});
