import { HttpClientError } from "@effect/platform";
import { ANSWER_BUDGET, answerOverdue } from "@sphynx/schema/public/deadlines";
import { Duration } from "effect";
import type { ParseError } from "effect/ParseResult";
import { ArrayFormatter } from "effect/ParseResult";

export class MissingApiKey extends Error {
  readonly name = "MissingApiKey";

  constructor() {
    super(
      "No API key. Pass { apiKey } to the Sphynx constructor or set SPHYNX_API_KEY."
    );
  }
}

const transportMessage = (error: unknown) => {
  if (
    !HttpClientError.isHttpClientError(error) ||
    error._tag !== "RequestError" ||
    error.reason !== "Transport"
  ) {
    return null;
  }

  const { origin } = new URL(error.request.url);

  return answerOverdue(error)
    ? `Sphynx at ${origin} took more than ${Duration.toSeconds(ANSWER_BUDGET)} seconds to answer. Try again in a moment.`
    : `Unable to reach Sphynx at ${origin}. Check your network connection, or set SPHYNX_BASE_URL if your Sphynx server is at another address.`;
};

export class SphynxError extends Error {
  readonly name = "SphynxError";
  readonly status: number | undefined;
  readonly cause: unknown;

  constructor(message: string, options: { cause: unknown; status?: number }) {
    super(message);
    this.cause = options.cause;
    this.status = options.status;
  }
}

const statusOf = (error: unknown) => {
  if (typeof error !== "object" || error === null) {
    return;
  }
  const tag = (error as { _tag?: unknown })._tag;
  switch (tag) {
    case "BadRequest":
      return 400;
    case "Unauthorized":
      return 401;
    case "Forbidden":
      return 403;
    case "NotFound":
      return 404;
    case "Conflict":
      return 409;
    case "InternalError":
      return 500;
    default:
      return;
  }
};

const rejectedFields = (error: unknown) => {
  if ((error as { readonly _tag?: unknown })._tag !== "ParseError") {
    return;
  }
  const issues = ArrayFormatter.formatErrorSync(error as ParseError);
  return issues
    .map((issue) =>
      issue.path.length > 0
        ? `${issue.path.join(".")}: ${issue.message}`
        : issue.message
    )
    .join("; ");
};

const messageOf = (error: unknown) => {
  const transport = transportMessage(error);
  if (transport !== null) {
    return transport;
  }
  if (typeof error === "object" && error !== null) {
    const rejected = rejectedFields(error);
    if (rejected) {
      return rejected;
    }
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
    const tag = (error as { _tag?: unknown })._tag;
    if (typeof tag === "string") {
      return tag;
    }
  }
  return "The request failed.";
};

export const asSphynxError = (error: unknown) =>
  error instanceof SphynxError
    ? error
    : new SphynxError(messageOf(error), {
        cause: error,
        status: statusOf(error),
      });
