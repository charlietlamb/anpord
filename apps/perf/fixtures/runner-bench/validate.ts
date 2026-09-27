import type { Validator } from "anpord";

export const wroteReport: Validator = async ({ readText }) => ({
  message: "report.txt says done",
  passed: (await readText("report.txt")).trim() === "done",
});
