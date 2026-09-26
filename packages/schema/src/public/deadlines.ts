import {
  HttpApi,
  HttpClient,
  HttpClientError,
  type HttpClientRequest,
} from "@effect/platform";
import { Context, Data, Duration, Effect, Option, Schedule } from "effect";
import { PublicApi } from "./api";
import { Repeatable } from "./repeatable";

const ATTEMPT_BUDGET = Duration.seconds(2);
const CONTACT_BUDGET = Duration.seconds(4);
export const ANSWER_BUDGET = Duration.seconds(30);

const quickly = Schedule.spaced(Duration.millis(250)).pipe(
  Schedule.intersect(Schedule.recurs(2))
);

const repeatablePaths = () => {
  const paths = new Set<string>();
  HttpApi.reflect(PublicApi, {
    onEndpoint: ({ endpoint, mergedAnnotations }) => {
      if (Option.isSome(Context.getOption(mergedAnnotations, Repeatable))) {
        paths.add(endpoint.path);
      }
    },
    onGroup: () => undefined,
  });
  return paths;
};

const REPEATABLE = repeatablePaths();

const isRepeatable = (request: HttpClientRequest.HttpClientRequest) => {
  const { pathname } = new URL(request.url);
  return (
    request.headers["idempotency-key"] !== undefined ||
    [...REPEATABLE].some((path) => pathname.endsWith(path))
  );
};

class Unanswered extends Data.TaggedError("Unanswered") {}

class Overdue extends Data.TaggedError("Overdue") {}

const notHeard = (
  request: HttpClientRequest.HttpClientRequest,
  cause: Unanswered | Overdue
) =>
  new HttpClientError.RequestError({
    cause,
    description:
      cause._tag === "Overdue"
        ? "Anpord took too long to answer"
        : "Anpord did not answer in time",
    reason: "Transport",
    request,
  });

export const neverAnswered = (error: unknown) =>
  HttpClientError.isHttpClientError(error) &&
  error._tag === "RequestError" &&
  error.cause instanceof Unanswered;

export const answerOverdue = (error: unknown) =>
  HttpClientError.isHttpClientError(error) &&
  error._tag === "RequestError" &&
  error.cause instanceof Overdue;

const firstContactWith = (baseUrl: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const probe = client.get(baseUrl).pipe(
      Effect.scoped,
      Effect.timeout(ATTEMPT_BUDGET),
      Effect.retry(quickly),
      Effect.interruptible,
      Effect.timeout(CONTACT_BUDGET),
      Effect.mapError(() => new Unanswered())
    );
    const [heard, forget] = yield* Effect.cachedInvalidateWithTTL(
      probe,
      Duration.infinity
    );
    return heard.pipe(
      Effect.tapError(() => forget),
      Effect.asVoid
    );
  });

export const withDeadlines = (baseUrl: string) =>
  Effect.map(
    firstContactWith(baseUrl),
    (heard) =>
      (client: HttpClient.HttpClient): HttpClient.HttpClient =>
        HttpClient.transform(client, (response, request) =>
          heard.pipe(
            Effect.mapError((unanswered) => notHeard(request, unanswered)),
            Effect.zipRight(
              isRepeatable(request)
                ? Effect.timeoutFail(Effect.interruptible(response), {
                    duration: ANSWER_BUDGET,
                    onTimeout: () => notHeard(request, new Overdue()),
                  })
                : response
            )
          )
        )
  );
