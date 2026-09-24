import { describe, expect, it } from "bun:test";
import {
  DEFAULT_USER_MODEL,
  type EvalUser,
} from "@anpord/schema/domain/eval-turns";
import { ConfigProvider, Effect, Option } from "effect";
import {
  namesOf,
  userModel,
  userModelOf,
  userModelRoute,
} from "../../src/domain/variant";

const configured = (values: ReadonlyMap<string, string>) =>
  Effect.runSync(
    userModel.pipe(
      Effect.withConfigProvider(ConfigProvider.fromMap(new Map(values)))
    )
  );

describe("the model that plays the user", () => {
  it("belongs only to a case that states a simulated user", () => {
    const simulated: EvalUser = {
      goal: "go live",
      kind: "simulated",
      prompt: "p",
    };
    const scripted: EvalUser = { kind: "scripted", replies: ["yes"] };

    expect(userModelOf(simulated, "gpt-5.4-mini")).toBe("gpt-5.4-mini");
    expect(userModelOf(scripted, "gpt-5.4-mini")).toBeNull();
    expect(userModelOf(null, "gpt-5.4-mini")).toBeNull();
    expect(userModelOf(undefined, "gpt-5.4-mini")).toBeNull();
  });

  it("defaults when nothing is configured", () => {
    expect(configured(new Map())).toBe(DEFAULT_USER_MODEL);
  });

  it("reads the configured model", () => {
    expect(
      configured(new Map([["ANPORD_USER_MODEL", "anthropic/claude-haiku"]]))
    ).toBe("anthropic/claude-haiku");
  });

  it("routes a named provider prefix to that provider", () => {
    expect(userModelRoute("anthropic/claude-haiku")).toEqual({
      model: "claude-haiku",
      providerId: "anthropic",
    });
  });

  it("sends an unprefixed or unknown prefix to openai whole", () => {
    expect(userModelRoute("gpt-5.4-mini")).toEqual({
      model: "gpt-5.4-mini",
      providerId: "openai",
    });
    expect(userModelRoute("nobody/model")).toEqual({
      model: "nobody/model",
      providerId: "openai",
    });
  });
});

describe("namesOf", () => {
  it("reads a stored harness and sandbox", () => {
    expect(namesOf({ harness: "codex", sandbox: "daytona" })).toEqual(
      Option.some({ harness: "codex", sandbox: "daytona" })
    );
  });

  it("refuses a row naming a harness or sandbox this build does not know", () => {
    expect(Option.isNone(namesOf({ harness: "gone", sandbox: "e2b" }))).toBe(
      true
    );
    expect(Option.isNone(namesOf({ harness: "codex", sandbox: "gone" }))).toBe(
      true
    );
  });
});
