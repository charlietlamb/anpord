import { Permissions } from "@anpord/schema/domain/permissions";
import { PublicApi } from "@anpord/schema/public/api";
import { HttpApiBuilder } from "@effect/platform";
import { authorized } from "../../../http/authorization/authorized-group";
import {
  finishBatch,
  leaseCredentials,
  listBatches,
  listCaseRuns,
  listModels,
  readBatch,
  readTail,
  reportTrial,
  runCase,
  startBatch,
  subscribeToBatch,
} from "../../evals/evals";

const read = { permission: Permissions.Evals.Read };
const write = { permission: Permissions.Evals.Write };

export const PublicEvalsHandlers = HttpApiBuilder.group(
  PublicApi,
  "evals",
  (handlers) =>
    authorized(handlers)
      .handle("list", read, ({ payload }) =>
        listBatches(payload.cursor ?? null, payload.limit)
      )
      .handle("start", write, ({ payload }) =>
        startBatch({
          ...payload,
          trigger: payload.trigger ?? { source: "api" },
        })
      )
      .handle("runCase", write, ({ payload }) =>
        runCase(payload.caseId, payload, {
          hostedOnly: true,
          trigger: { source: "api" },
        })
      )
      .handle("get", read, ({ payload }) => readBatch(payload.id))
      .handle("caseRuns", read, ({ payload }) =>
        listCaseRuns(payload.caseId, payload.page, payload.variant)
      )
      .handle("subscription", read, ({ payload }) =>
        subscribeToBatch(payload.id)
      )
      .handle("tail", read, ({ payload }) => readTail(payload.id, payload.after))
      .handle("credentials", write, ({ payload }) =>
        leaseCredentials(payload.id, payload.harness)
      )
      .handle("reportTrial", write, ({ payload }) => reportTrial(payload))
      .handle("finish", write, ({ payload }) => finishBatch(payload.id))
      .handle("models", read, ({ payload }) =>
        listModels(payload.harness, payload.q)
      ).done
);
