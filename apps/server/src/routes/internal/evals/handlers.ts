import { Permissions } from "@anpord/schema/domain/permissions";
import { AnpordApi } from "@anpord/schema/internal/api";
import { HttpApiBuilder } from "@effect/platform";
import { authorized } from "../../../http/authorization/authorized-group";
import {
  listCaseRuns,
  listCases,
  readArtifact,
  readBatch,
  readCase,
  readRun,
  readTail,
  readTrialAddress,
  runCase,
  subscribeToBatch,
} from "../../evals/evals";

const read = { permission: Permissions.Evals.Read };
const write = { permission: Permissions.Evals.Write };

export const EvalsHandlers = HttpApiBuilder.group(
  AnpordApi,
  "evals",
  (handlers) =>
    authorized(handlers)
      .handle("artifact", read, ({ payload }) => readArtifact(payload))
      .handle("cases", read, ({ urlParams }) =>
        listCases({
          cursor:
            urlParams.cursorId === undefined ||
            urlParams.cursorStartedAt === undefined
              ? null
              : {
                  id: urlParams.cursorId,
                  startedAtMillis: urlParams.cursorStartedAt,
                },
          limit: urlParams.limit,
          suite: urlParams.suite ?? null,
          tag: urlParams.tag ?? null,
        })
      )
      .handle("case", read, ({ path }) => readCase(path.id))
      .handle("caseRuns", read, ({ path, urlParams }) =>
        listCaseRuns(path.id, urlParams.page, urlParams.variant)
      )
      .handle("runCase", write, ({ path, payload }) =>
        runCase(path.id, payload, {
          hostedOnly: false,
          trigger: { source: "dashboard" },
        })
      )
      .handle("run", read, ({ path }) => readRun(path.id))
      .handle("trialAddress", read, ({ path }) => readTrialAddress(path.id))
      .handle("batch", read, ({ path }) => readBatch(path.id))
      .handle("subscription", read, ({ path }) => subscribeToBatch(path.id))
      .handle("tail", read, ({ path, payload }) =>
        readTail(path.id, payload.after)
      ).done
);
