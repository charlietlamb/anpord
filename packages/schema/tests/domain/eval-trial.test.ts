import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import { EvalTrial } from "../../src/domain/evals";

const sent = {
  artifacts: [],
  commands: 0,
  costs: null,
  exitCode: -1,
  failedCommands: 0,
  filesChanged: [],
  id: "trl_1",
  modelMs: 0,
  ordinal: 1,
  sandboxId: null,
  sandboxMs: 0,
  status: "void",
  timed: false,
  trajectory: [],
  usage: null,
  validations: [],
  verifySteps: [],
  voidFields: [],
};

const decode = Schema.decodeUnknownSync(EvalTrial);

describe("a trial on the wire", () => {
  it("carries why it stopped before it was scored", () => {
    const trial = decode({
      ...sent,
      failure: "The agent ran past its time limit of 5m",
    });

    expect(trial.failure).toBe("The agent ran past its time limit of 5m");
    expect(Schema.encodeSync(EvalTrial)(trial).failure).toBe(
      "The agent ran past its time limit of 5m"
    );
  });

  it("reads a server that does not send a reason as having none", () => {
    expect(decode(sent).failure).toBeNull();
  });
});
