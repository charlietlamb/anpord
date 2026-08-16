import { describe, expect, test } from "bun:test";
import { OrganizationId } from "@anpord/schema/domain/actor";
import {
  ChannelName,
  PromptId,
  VersionNumber,
} from "@anpord/schema/domain/prompts";
import { Schema } from "effect";
import { promptPrefix, selectorKey } from "../../src/domain/keys";

const channel = (value: string) => Schema.decodeSync(ChannelName)(value);
const version = (value: number) => Schema.decodeSync(VersionNumber)(value);
const promptId = (value: string) => Schema.decodeSync(PromptId)(value);

const org = (value: string) => Schema.decodeSync(OrganizationId)(value);

const ORG = org("org_1");
const ID = promptId("hello-world");

describe("cache keys", () => {
  test("every selector for a prompt shares its invalidation prefix", () => {
    const prefix = promptPrefix(ORG, ID);

    expect(selectorKey(ORG, ID, {})).toStartWith(prefix);
    expect(selectorKey(ORG, ID, { version: version(3) })).toStartWith(prefix);
    expect(selectorKey(ORG, ID, { channel: channel("latest") })).toStartWith(
      prefix
    );
  });

  test("selectors resolve to distinct keys", () => {
    const keys = new Set([
      selectorKey(ORG, ID, {}),
      selectorKey(ORG, ID, { version: version(3) }),
      selectorKey(ORG, ID, { channel: channel("latest") }),
      selectorKey(ORG, ID, { channel: channel("staging") }),
    ]);

    expect(keys.size).toBe(4);
  });

  test("an omitted selector resolves the production channel", () => {
    expect(selectorKey(ORG, ID, {})).toBe(
      selectorKey(ORG, ID, { channel: channel("production") })
    );
  });

  test("organizations are isolated", () => {
    expect(promptPrefix(org("org_1"), ID)).not.toBe(
      promptPrefix(org("org_2"), ID)
    );
  });

  test("a renamed handle uses a different prefix, so both need invalidating", () => {
    expect(promptPrefix(ORG, ID)).not.toBe(
      promptPrefix(ORG, promptId("renamed"))
    );
  });
});
