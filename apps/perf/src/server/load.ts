import type { RequestSpec, Workload } from "./endpoints";

export interface Credentials {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly cookie: string;
}

interface Sample {
  readonly bytes: number;
  readonly failure?: string;
  readonly ms: number;
  readonly ok: boolean;
}

export interface LoadResult {
  readonly samples: readonly Sample[];
  readonly wallMs: number;
}

const headersFor = (spec: RequestSpec, credentials: Credentials) => ({
  ...(spec.body === undefined ? {} : { "content-type": "application/json" }),
  ...(spec.auth === "key"
    ? { authorization: `Bearer ${credentials.apiKey}` }
    : { cookie: credentials.cookie, origin: credentials.baseUrl }),
});

interface Sent {
  readonly body: string;
  readonly sample: Sample;
}

const send = async (
  spec: RequestSpec,
  credentials: Credentials
): Promise<Sent> => {
  const started = performance.now();
  try {
    const response = await fetch(`${credentials.baseUrl}${spec.path}`, {
      body: spec.body === undefined ? undefined : JSON.stringify(spec.body),
      headers: headersFor(spec, credentials),
      method: spec.method,
    });
    const body = await response.text();
    return {
      body,
      sample: {
        bytes: Buffer.byteLength(body),
        ms: performance.now() - started,
        ok: response.ok,
        ...(response.ok
          ? {}
          : { failure: `${response.status} ${body.slice(0, 300)}` }),
      },
    };
  } catch {
    return {
      body: "",
      sample: {
        bytes: 0,
        failure: "no response",
        ms: performance.now() - started,
        ok: false,
      },
    };
  }
};

export const drive = async (
  workload: Workload,
  credentials: Credentials,
  offset: number,
  count: number,
  concurrency: number
): Promise<LoadResult> => {
  const samples: Sample[] = [];
  let next = 0;
  const worker = async () => {
    while (next < count) {
      const index = next;
      next += 1;
      const sent = await send(workload.requests(offset + index), credentials);
      samples.push(sent.sample);
      if (sent.sample.ok) {
        await workload.settle?.(sent.body);
      }
    }
  };
  const started = performance.now();
  await Promise.all(Array.from({ length: concurrency }, worker));
  return { samples, wallMs: performance.now() - started };
};
