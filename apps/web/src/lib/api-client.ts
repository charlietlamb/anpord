import type { Schema } from "effect";
import { fromWire } from "@/lib/wire";

export class HttpError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

type SearchValue = number | string | null | undefined;

export const searchOf = (params: Readonly<Record<string, SearchValue>>) => {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  }

  return query.size > 0 ? `?${query}` : "";
};

const failureOf = async (response: Response) => {
  const body = (await response.json().catch(() => null)) as {
    message?: string;
  } | null;

  return new HttpError(
    body?.message ?? `Request failed (${response.status})`,
    response.status
  );
};

export const createApiClient = (base: string) => {
  const send = async (path: string, init?: RequestInit) => {
    const response = await fetch(`${base}${path}`, {
      credentials: "same-origin",
      ...init,
      headers: { "content-type": "application/json", ...init?.headers },
    });

    if (!response.ok) {
      throw await failureOf(response);
    }

    return response;
  };

  const request = async <A, I>(
    schema: Schema.Schema<A, I>,
    path: string,
    init?: RequestInit
  ): Promise<A> => {
    const response = await send(path, init);
    const payload = response.status === 204 ? undefined : await response.json();

    return fromWire(schema, payload);
  };

  const withBody =
    (method: "PATCH" | "POST" | "PUT") =>
    <A, I>(schema: Schema.Schema<A, I>, path: string, body: unknown) =>
      request(schema, path, { body: JSON.stringify(body), method });

  return {
    patch: withBody("PATCH"),
    post: withBody("POST"),
    put: withBody("PUT"),
    remove: async (path: string) => {
      await send(path, { method: "DELETE" });
    },
    request,
    send,
  };
};
