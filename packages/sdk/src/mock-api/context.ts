import { readFile } from "node:fs/promises";
import {
  API_JOURNAL,
  API_MANIFEST,
  ApiCall,
  ApiManifest,
} from "@anpord/schema/domain/api-mocks";
import { Schema } from "effect";

export const apiContext = {
  url: async (name: string): Promise<string> => {
    const manifest = Schema.decodeUnknownSync(Schema.parseJson(ApiManifest))(
      await readFile(API_MANIFEST, "utf8")
    );
    const api = manifest.find((entry) => entry.name === name);
    if (api === undefined) {
      throw new Error(`API mock not configured: ${name}`);
    }
    return api.url;
  },
  calls: async (name?: string): Promise<readonly ApiCall[]> => {
    const text = await readFile(API_JOURNAL, "utf8");
    return text.trim() === ""
      ? []
      : text
          .trim()
          .split("\n")
          .map((line) =>
            Schema.decodeUnknownSync(Schema.parseJson(ApiCall))(line)
          )
          .filter((call) => name === undefined || call.api === name);
  },
};
