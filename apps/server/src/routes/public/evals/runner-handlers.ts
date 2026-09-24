import { Permissions } from "@anpord/schema/domain/permissions";
import { PublicApi } from "@anpord/schema/public/api";
import { HttpApiBuilder } from "@effect/platform";
import { authorized } from "../../../http/authorization/authorized-group";
import {
  finishBatch,
  leaseCredentials,
  readTail,
  reportTrial,
  startBatch,
  subscribeToBatch,
} from "../../evals/evals";

const read = { permission: Permissions.Evals.Read };
const write = { permission: Permissions.Evals.Write };

export const RunnerHandlers = HttpApiBuilder.group(
  PublicApi,
  "runner",
  (handlers) =>
    authorized(handlers)
      .handle("start", write, ({ payload }) =>
        startBatch({
          ...payload,
          trigger: payload.trigger ?? { source: "cli" },
        })
      )
      .handle("lease", write, ({ payload }) =>
        leaseCredentials(payload.id, payload.harness)
      )
      .handle("report", write, ({ payload }) => reportTrial(payload))
      .handle("finish", write, ({ payload }) => finishBatch(payload.id))
      .handle("subscribe", read, ({ payload }) => subscribeToBatch(payload.id))
      .handle("tail", read, ({ payload }) =>
        readTail(payload.id, payload.after)
      ).done
);
