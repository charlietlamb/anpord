import type { EvalValidation } from "@anpord/schema/domain/eval-validations";
import type { HarnessEvent } from "@anpord/schema/domain/harness-event";
import { Effect, Layer } from "effect";
import { redactEvent, redactValidation } from "../domain/secret-redaction";
import { trialSecrets } from "../domain/trial-secrets";
import { AgentTrial, type AgentTrialRequest } from "./agent-trial";

export const AgentTrialRedactedLive = Layer.effect(
  AgentTrial,
  Effect.map(AgentTrial, (trial) =>
    AgentTrial.of({
      run: (request: AgentTrialRequest) => {
        const known = trialSecrets(request);
        const validation = (record: EvalValidation) =>
          redactValidation(record, known);
        const event = (entry: HarnessEvent) => redactEvent(entry, known);
        const { onValidation, progress } = request;

        return trial
          .run({
            ...request,
            onValidation:
              onValidation === undefined
                ? undefined
                : (record) => onValidation(validation(record)),
            progress:
              progress === undefined
                ? undefined
                : {
                    append: (events, from) =>
                      progress.append(events.map(event), from),
                  },
          })
          .pipe(
            Effect.map((result) => ({
              ...result,
              conversationEvents: result.conversationEvents.map(event),
              events: result.events.map(event),
              outcome: {
                ...result.outcome,
                validations: result.outcome.validations?.map(validation),
              },
            }))
          );
      },
    })
  )
);
