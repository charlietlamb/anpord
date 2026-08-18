import { describe, expect, test } from "bun:test";
import { ChannelName, VersionNumber } from "@anpord/schema/domain/prompts";
import { Schema } from "effect";
import { answeringChannel, resolutionFor } from "../../src/domain/resolution";

const channel = (value: string) => Schema.decodeSync(ChannelName)(value);
const version = (value: number) => Schema.decodeSync(VersionNumber)(value);

const channelFor = (
  selector: Parameters<typeof resolutionFor>[0],
  fallback: ChannelName | null = null
) => answeringChannel(resolutionFor(selector), fallback);

describe("resolution", () => {
  test("an omitted selector defers to the organisation", () => {
    expect(resolutionFor({})).toEqual({ _tag: "Default" });
  });

  test("an omitted selector reports the channel that answered it", () => {
    expect(channelFor({}, channel("live"))).toBe(channel("live"));
  });

  test("an omitted selector reports no channel when none answered", () => {
    expect(channelFor({})).toBeNull();
  });

  test("an explicit channel is reported back", () => {
    expect(channelFor({ channel: channel("staging") })).toBe(
      channel("staging")
    );
  });

  test("an explicit channel ignores the organisation's default", () => {
    expect(channelFor({ channel: channel("staging") }, channel("live"))).toBe(
      channel("staging")
    );
  });

  test("a pinned version answers from no channel", () => {
    expect(channelFor({ version: version(3) })).toBeNull();
  });

  test("a version wins over a channel", () => {
    expect(
      channelFor({ channel: channel("staging"), version: version(3) })
    ).toBeNull();
  });

  test("a version wins over the default", () => {
    expect(channelFor({ version: version(3) }, channel("live"))).toBeNull();
  });
});
