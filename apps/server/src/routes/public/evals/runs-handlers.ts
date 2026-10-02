import { HttpApiBuilder } from "@effect/platform";
import { Permissions } from "@sphynx/schema/domain/permissions";
import { PublicApi } from "@sphynx/schema/public/api";
import { authorized } from "../../../http/authorization/authorized-group";
import { listCaseRuns, readRun } from "../../evals/run-reads";

const read = { permission: Permissions.Evals.Read };

export const RunsHandlers = HttpApiBuilder.group(
  PublicApi,
  "runs",
  (handlers) =>
    authorized(handlers)
      .handle("list", read, ({ payload }) =>
        listCaseRuns(payload.caseId, payload.page, payload.variant)
      )
      .handle("get", read, ({ payload }) => readRun(payload.id)).done
);
