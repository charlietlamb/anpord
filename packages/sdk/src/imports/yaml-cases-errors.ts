import { Data } from "effect";

export class CaseDirectoryUnreadable extends Data.TaggedError(
  "CaseDirectoryUnreadable"
)<{ readonly cause: unknown; readonly path: string }> {
  override get message() {
    return `Could not list ${this.path}`;
  }
}

export class CaseFileNotYaml extends Data.TaggedError("CaseFileNotYaml")<{
  readonly path: string;
  readonly reason: string;
}> {
  override get message() {
    return `${this.path} is not YAML: ${this.reason}`;
  }
}

/** Names the file rather than a path into the decoded value, because one case
 * is one file and the file name is what the author searches for. */
export class CaseFileNotYamlCase extends Data.TaggedError(
  "CaseFileNotYamlCase"
)<{ readonly path: string; readonly reason: string }> {
  override get message() {
    return `${this.path} is not a yaml case: ${this.reason}`;
  }
}

export class CaseDirectoryEmpty extends Data.TaggedError("CaseDirectoryEmpty")<{
  readonly path: string;
}> {
  override get message() {
    return `${this.path} holds no .yaml or .yml files, so there is nothing to import`;
  }
}
