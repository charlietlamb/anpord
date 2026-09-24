import type { AnpordClient } from "@anpord/schema/public/client";
import {
  RunCaseBatchRequest,
  SuiteBatchRequest,
} from "@anpord/schema/public/evals-api";
import { Either, Schema } from "effect";
import { compileDefinition } from "../evals/compiler";
import { sourceUrlOf } from "../evals/define";
import { tooLargeToSubmit } from "../evals/request-size";
import type { EvalDefinition } from "../evals/types";
import { AnpordError, asAnpordError } from "./errors";
import { type Promised, promised } from "./promised";
import { type WaitOptions, waitForBatch } from "./wait";

type Batches = Promised<AnpordClient["batches"]>;
type Cases = Promised<AnpordClient["cases"]>;
type Batch = Awaited<ReturnType<Batches["get"]>>;

export type StartInput = typeof SuiteBatchRequest.Encoded | EvalDefinition;

export interface BatchesSurface extends Omit<Batches, "start"> {
  readonly start: (input: StartInput) => ReturnType<Batches["start"]>;
  readonly startAndWait: (
    input: StartInput & Partial<WaitOptions>
  ) => Promise<Batch>;
  readonly wait: (
    options: { readonly id: string } & WaitOptions
  ) => Promise<Batch>;
}

export interface CasesSurface extends Omit<Cases, "run"> {
  readonly run: (
    input: typeof RunCaseBatchRequest.Encoded
  ) => ReturnType<Cases["run"]>;
}

export interface EvalsSurface {
  readonly batches: BatchesSurface;
  readonly cases: CasesSurface;
  readonly models: Promised<AnpordClient["models"]>;
  readonly runs: Promised<AnpordClient["runs"]>;
}

const decodeStart = Schema.decodeUnknownEither(SuiteBatchRequest);
const decodeRunCase = Schema.decodeUnknownEither(RunCaseBatchRequest);

const decodedOrThrow = <A, E>(decoded: Either.Either<A, E>) => {
  if (Either.isLeft(decoded)) {
    throw asAnpordError(decoded.left);
  }

  return decoded.right;
};

const requestOf = async (input: StartInput) => {
  if (sourceUrlOf(input as EvalDefinition) !== undefined) {
    return await compileDefinition(input as EvalDefinition);
  }

  return decodedOrThrow(decodeStart(input));
};

const submittable = async (input: StartInput) => {
  const request = await requestOf(input);
  const tooLarge = tooLargeToSubmit(request);

  if (tooLarge !== null) {
    throw new AnpordError(tooLarge, { cause: null });
  }

  return request;
};

const batchesSurface = (client: AnpordClient): BatchesSurface => {
  const batches = promised(client.batches);

  return {
    ...batches,
    start: async (input) => await batches.start(await submittable(input)),
    startAndWait: async (input) => {
      const { id } = await batches.start(await submittable(input));
      return await waitForBatch(batches.get, id, input);
    },
    wait: ({ id, ...options }) => waitForBatch(batches.get, id, options),
  };
};

const casesSurface = (client: AnpordClient): CasesSurface => {
  const cases = promised(client.cases);

  return {
    ...cases,
    run: async (input) => await cases.run(decodedOrThrow(decodeRunCase(input))),
  };
};

export const evalsSurface = (client: AnpordClient): EvalsSurface => ({
  batches: batchesSurface(client),
  cases: casesSurface(client),
  models: promised(client.models),
  runs: promised(client.runs),
});
