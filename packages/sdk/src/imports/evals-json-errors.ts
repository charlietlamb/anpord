import { Data } from "effect";

export class CaseFileUnreadable extends Data.TaggedError("CaseFileUnreadable")<{
  readonly cause: unknown;
  readonly path: string;
}> {
  override get message() {
    return `Could not read ${this.path}`;
  }
}

export class CaseFileNotJson extends Data.TaggedError("CaseFileNotJson")<{
  readonly path: string;
  readonly reason: string;
}> {
  override get message() {
    return `${this.path} is not JSON: ${this.reason}`;
  }
}

/** Names the case rather than the byte offset, because the author fixing it
 * reads the file by case, not by position. */
export class CaseFileNotEvalsJson extends Data.TaggedError(
  "CaseFileNotEvalsJson"
)<{ readonly path: string; readonly reason: string }> {
  override get message() {
    return `${this.path} is not an evals-json file: ${this.reason}`;
  }
}

export class CaseFileEmpty extends Data.TaggedError("CaseFileEmpty")<{
  readonly path: string;
}> {
  override get message() {
    return `${this.path} declares no cases, so there is nothing to import`;
  }
}
