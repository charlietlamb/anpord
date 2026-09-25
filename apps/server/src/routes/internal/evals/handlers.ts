import { Permissions } from "@anpord/schema/domain/permissions";
import { AnpordApi } from "@anpord/schema/internal/api";
import { HttpApiBuilder } from "@effect/platform";
import { authorized } from "../../../http/authorization/authorized-group";
import {
  cursorOf,
  listCaseRuns,
  listCases,
  listSuites,
  readArtifact,
  readBatch,
  readCase,
  readRun,
  readSuite,
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
          cursor: cursorOf(urlParams),
          limit: urlParams.limit,
          order: urlParams.order ?? "desc",
          q: urlParams.q?.trim() || null,
          sort: urlParams.sort ?? "recent",
          suite: urlParams.suite ?? null,
          tag: urlParams.tag ?? null,
        })
      )
      .handle("suites", read, ({ urlParams }) =>
        listSuites(cursorOf(urlParams), urlParams.limit)
      )
      .handle("suite", read, ({ path }) => readSuite(path.id))
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
