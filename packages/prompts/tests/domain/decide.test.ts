import { describe, expect, it } from "bun:test";
import { VersionNumber } from "@anpord/schema/domain/prompts";
import { Percent, type Release, Salt } from "@anpord/schema/domain/releases";
import { decide } from "../../src/domain/decide";

const v = (n: number) => VersionNumber.make(n);

const pinned: Release = { _tag: "Pinned", version: v(4) };

const rollout = (percent: number): Release => ({
  _tag: "Rollout",
  assignmentSalt: Salt.make("assignment-salt-0001"),
  exposureSalt: Salt.make("exposure-salt-000001"),
  percent: Percent.make(percent),
  previous: v(4),
  version: v(5),
});

describe("decide", () => {
  it("serves the pinned version whoever asks", () => {
    for (const unit of [undefined, "user_1", "user_2"]) {
      expect(decide(pinned, unit)).toEqual({
        percent: null,
        reason: "pinned",
        version: v(4),
      });
    }
  });

  /** The compatibility guarantee in one assertion: a pinned release cannot
   * read the unit, so nothing a caller sends can change what it answers. */
  it("ignores the unit entirely when pinned", () => {
    expect(decide(pinned, "anything")).toEqual(decide(pinned, undefined));
  });

  it("serves the previous version to a caller with no unit", () => {
    expect(decide(rollout(50), undefined)).toEqual({
      percent: 50,
      reason: "no-unit",
      version: v(4),
    });
  });

  it("answers the same version for one unit every time", () => {
    const first = decide(rollout(50), "user_7");
    for (let attempt = 0; attempt < 20; attempt++) {
      expect(decide(rollout(50), "user_7")).toEqual(first);
    }
  });

  it("serves both versions across a population", () => {
    const served = new Set(
      Array.from(
        { length: 200 },
        (_, index) => decide(rollout(50), `user_${index}`).version
      )
    );
    expect(served).toEqual(new Set([v(4), v(5)]));
  });

  /** Ramping admits callers and never returns one to the old version, so a
   * caller who has seen the new prompt keeps seeing it. */
  it("only ever moves a caller from previous to version as it ramps", () => {
    for (let index = 0; index < 2000; index++) {
      const unit = `user_${index}`;
      let moved = false;
      for (const percent of [5, 20, 50, 80, 99]) {
        const onNew = decide(rollout(percent), unit).version === v(5);
        if (moved) {
          expect(onNew).toBe(true);
        }
        moved = moved || onNew;
      }
    }
  });

  it("reports the percent so a log stays readable after the rollout widens", () => {
    expect(decide(rollout(10), "user_1").percent).toBe(10);
    expect(decide(rollout(90), "user_1").percent).toBe(90);
  });
});
