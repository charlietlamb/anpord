import { describe, expect, test } from "bun:test";
import { ChannelName, VersionNumber } from "@anpord/schema/domain/prompts";
import { Schema } from "effect";
import { answeringChannel, resolutionFor } from "../../src/domain/resolution";

const channel = (value: string) => Schema.decodeSync(ChannelName)(value);
const version = (value: number) => Schema.decodeSync(VersionNumber)(value);

const channelFor = (selector: Parameters<typeof resolutionFor>[0]) =>
  answeringChannel(resolutionFor(selector));

describe("answering channel", () => {
  test("an omitted selector reports the production channel it resolved", () => {
    expect(channelFor({})).toBe(channel("production"));
  });

  test("an explicit channel is reported back", () => {
    expect(channelFor({ channel: channel("staging") })).toBe(
      channel("staging")
    );
  });

  test("the latest channel is reported rather than the channel it stands for", () => {
    expect(channelFor({ channel: channel("latest") })).toBe(channel("latest"));
  });

  test("a pinned version answers from no channel", () => {
    expect(channelFor({ version: version(3) })).toBeNull();
  });

  test("a version wins over a channel", () => {
    expect(
      channelFor({ channel: channel("staging"), version: version(3) })
    ).toBeNull();
  });
});
