import { Effect, Option } from "effect";
import type { PageCursor } from "../domain/page";
import { pageOf, pageSizeOf } from "../domain/page";
import { EventRepository } from "../repositories/event-repository";
import { RunQuery } from "../repositories/run-query";
import type { LiveRuns } from "./live-runs";
import { runToState } from "./stored-run-state";

/** Reads runs as they are: the live one if this process holds it, otherwise
 * the record. */
export const makeReadRuns = (live: LiveRuns) =>
  Effect.gen(function* () {
    const query = yield* RunQuery;
    const events = yield* EventRepository;

    const get = (organizationId: string, id: string) =>
      live.get(id).pipe(
        Effect.flatMap((current) => {
          if (
            Option.isSome(current) &&
            current.value.organizationId === organizationId
          ) {
            return Effect.succeed(current);
          }

          return query.findRun(organizationId, id).pipe(
            Effect.flatMap((found) => {
              if (Option.isNone(found)) {
                return Effect.succeedNone;
              }

              const trialIds = found.value.cells.flatMap((cell) =>
                cell.trials.map((trial) => trial.internalId)
              );

              return events
                .listByTrials(trialIds)
                .pipe(
                  Effect.map((journals) =>
                    Option.some(runToState(found.value, journals))
                  )
                );
            }),
            Effect.orDie
          );
        }),
        Effect.withSpan("GridRun.get")
      );

    const list = (input: {
      readonly cursor: PageCursor | null;
      readonly limit: number | undefined;
      readonly organizationId: string;
    }) =>
      Effect.gen(function* () {
        const size = pageSizeOf(input.limit);

        /* Together: the count is a second query and waiting for it after
           the page would add its latency to every step. */
        const { rows, total } = yield* Effect.all(
          {
            rows: query.listRuns({
              cursor: input.cursor,
              limit: size,
              organizationId: input.organizationId,
            }),
            total: query.countRuns(input.organizationId),
          },
          { concurrency: 2 }
        );

        const page = pageOf(rows, size);

        const current = yield* Effect.forEach(
          page.items,
          (row) => live.get(row.id),
          { concurrency: "unbounded" }
        );
        const storedRows = page.items.filter((_, index) =>
          Option.isNone(current[index] ?? Option.none())
        );
        const stored = yield* query.hydrateRuns(storedRows);
        const storedById = new Map(
          stored.map((detail) => [detail.run.id, runToState(detail)])
        );
        const states = page.items.flatMap((row, index) =>
          Option.match(current[index] ?? Option.none(), {
            onNone: () => {
              const state = storedById.get(row.id);
              return state === undefined ? [] : [state];
            },
            onSome: (state) =>
              state.organizationId === input.organizationId ? [state] : [],
          })
        );

        const last = page.items.at(-1);

        return {
          next:
            page.hasMore && last !== undefined
              ? { id: last.id, startedAtMillis: last.createdAt.getTime() }
              : null,
          runs: states,
          total,
        };
      }).pipe(Effect.orDie, Effect.withSpan("GridRun.list"));

    /* The tag list comes back with the page rather than from its own call: the
       filter is drawn beside the rows it filters, so one without the other is
       a half-rendered screen. */
    const cases = (input: {
      readonly limit: number | undefined;
      readonly organizationId: string;
      readonly tag: string | null;
    }) =>
      Effect.all(
        {
          cases: query.listCases({
            limit: pageSizeOf(input.limit),
            organizationId: input.organizationId,
            tag: input.tag,
          }),
          tags: query.listTags(input.organizationId),
        },
        { concurrency: 2 }
      ).pipe(Effect.orDie, Effect.withSpan("GridRun.cases"));

    return { cases, get, list };
  });
