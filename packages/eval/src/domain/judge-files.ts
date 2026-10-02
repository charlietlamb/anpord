import type { EvalValidator } from "@sphynx/schema/domain/eval-definition";

export const JUDGE_FILE_LIMIT = 32_000;
export const JUDGE_FILES_LIMIT = 96_000;

export type JudgeFile =
  | { readonly kind: "read"; readonly path: string; readonly text: string }
  | { readonly kind: "missing"; readonly path: string }
  | {
      readonly kind: "oversized";
      readonly path: string;
      readonly limit: "file" | "total";
    };

export type ReadJudgeFile = Extract<JudgeFile, { readonly kind: "read" }>;

export const judgeFilePaths = (validator: EvalValidator | null | undefined) =>
  validator == null || "source" in validator
    ? []
    : [...new Set(validator.judges.flatMap((judge) => judge.files ?? []))];

const count = (value: number) => value.toLocaleString("en-US");

export const judgeFileProblem = (file: Exclude<JudgeFile, ReadJudgeFile>) => {
  switch (file.kind) {
    case "missing":
      return `Judge file ${file.path} was not in the workspace when the trial finished`;
    case "oversized":
      return file.limit === "file"
        ? `Judge file ${file.path} is over the ${count(JUDGE_FILE_LIMIT)} character limit`
        : `Judge file ${file.path} takes the judge files over the ${count(JUDGE_FILES_LIMIT)} character total`;
    default:
      return file satisfies never;
  }
};
