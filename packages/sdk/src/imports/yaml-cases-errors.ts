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
